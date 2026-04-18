import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Search } from "lucide-react";
import { formatKZT } from "@/utils/formatMoney";
import { useAuth } from "@/hooks/useAuth";
import { downloadCSV } from "@/utils/exportCSV";

interface Withdrawal {
  id: string;
  user_id: string;
  amount_kzt: number;
  currency: string;
  status: string;
  created_at: string;
  payload: any;
  transaction_id?: string | null;
  method_id?: string | null;
  user?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface WithdrawalsHistoryProps {
  showExport?: boolean;
  showStats?: boolean;
  ownOnly?: boolean;
}

export function WithdrawalsHistory({
  showExport = false,
  showStats = false,
  ownOnly = false,
}: WithdrawalsHistoryProps) {
  const { userRole } = useAuth();
  const isAdmin = !ownOnly && (userRole === "admin" || userRole === "superadmin");

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    void fetchWithdrawals();
  }, [methodFilter, statusFilter, startDate, endDate, ownOnly, userRole]);

  const filteredWithdrawals = useMemo(() => {
    if (!isAdmin) {
      return withdrawals;
    }

    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) {
      return withdrawals;
    }

    return withdrawals.filter((withdrawal) => {
      const name = withdrawal.user?.full_name?.toLowerCase() ?? "";
      const email = withdrawal.user?.email?.toLowerCase() ?? "";
      return name.includes(query) || email.includes(query);
    });
  }, [debouncedSearchQuery, isAdmin, withdrawals]);

  const stats = useMemo(() => {
    const totalAmount = filteredWithdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount_kzt, 0);
    return {
      count: filteredWithdrawals.length,
      totalAmount,
    };
  }, [filteredWithdrawals]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setWithdrawals([]);
        return;
      }

      const shouldLimitToOwnRecords = ownOnly || (userRole !== "admin" && userRole !== "superadmin");

      let withdrawalsQuery = supabase
        .from("withdrawals")
        .select("id, user_id, amount_cents, method_id, transaction_id, status, created_at")
        .order("created_at", { ascending: false });

      let transactionsQuery = supabase
        .from("transactions")
        .select("id, user_id, amount_cents, currency, status, created_at, payload")
        .eq("type", "withdrawal")
        .order("created_at", { ascending: false });

      if (shouldLimitToOwnRecords) {
        withdrawalsQuery = withdrawalsQuery.eq("user_id", user.id);
        transactionsQuery = transactionsQuery.eq("user_id", user.id);
      }

      if (statusFilter !== "all") {
        withdrawalsQuery = withdrawalsQuery.eq(
          "status",
          statusFilter as "completed" | "processing" | "failed" | "pending" | "cancelled",
        );
        transactionsQuery = transactionsQuery.eq(
          "status",
          statusFilter as "completed" | "processing" | "failed" | "pending" | "frozen",
        );
      }

      if (startDate) {
        const isoStartDate = new Date(startDate).toISOString();
        withdrawalsQuery = withdrawalsQuery.gte("created_at", isoStartDate);
        transactionsQuery = transactionsQuery.gte("created_at", isoStartDate);
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        const isoEndDate = endDateTime.toISOString();
        withdrawalsQuery = withdrawalsQuery.lte("created_at", isoEndDate);
        transactionsQuery = transactionsQuery.lte("created_at", isoEndDate);
      }

      const [
        { data: withdrawalsData, error: withdrawalsError },
        { data: transactionsData, error: transactionsError },
      ] = await Promise.all([withdrawalsQuery, transactionsQuery]);

      if (withdrawalsError) {
        console.error("Error fetching withdrawals table:", withdrawalsError);
      }

      if (transactionsError) {
        console.error("Error fetching withdrawal transactions:", transactionsError);
      }

      if (withdrawalsError && transactionsError) {
        throw transactionsError;
      }

      const transactionMap = new Map(
        ((transactionsData as any[]) || []).map((transaction) => [transaction.id, transaction]),
      );
      const mergedWithdrawals = new Map<string, Withdrawal>();

      ((withdrawalsData as any[]) || []).forEach((withdrawal) => {
        const linkedTransaction = withdrawal.transaction_id
          ? transactionMap.get(withdrawal.transaction_id)
          : undefined;
        const historyId = linkedTransaction?.id || withdrawal.transaction_id || withdrawal.id;

        mergedWithdrawals.set(historyId, {
          id: historyId,
          user_id: withdrawal.user_id,
          amount_kzt:
            linkedTransaction?.amount_kzt ??
            linkedTransaction?.amount_cents ??
            withdrawal.amount_kzt ??
            withdrawal.amount_cents ??
            0,
          currency: linkedTransaction?.currency ?? "KZT",
          status: linkedTransaction?.status ?? withdrawal.status,
          created_at: linkedTransaction?.created_at ?? withdrawal.created_at,
          payload: linkedTransaction?.payload ?? {},
          transaction_id: withdrawal.transaction_id,
          method_id: withdrawal.method_id,
        });
      });

      ((transactionsData as any[]) || []).forEach((transaction) => {
        const existingWithdrawal = mergedWithdrawals.get(transaction.id);

        mergedWithdrawals.set(transaction.id, {
          id: transaction.id,
          user_id: transaction.user_id,
          amount_kzt: transaction.amount_kzt ?? transaction.amount_cents ?? existingWithdrawal?.amount_kzt ?? 0,
          currency: transaction.currency ?? existingWithdrawal?.currency ?? "KZT",
          status: transaction.status ?? existingWithdrawal?.status ?? "completed",
          created_at: transaction.created_at ?? existingWithdrawal?.created_at ?? new Date().toISOString(),
          payload: transaction.payload ?? existingWithdrawal?.payload ?? {},
          transaction_id: existingWithdrawal?.transaction_id ?? transaction.id,
          method_id: existingWithdrawal?.method_id ?? null,
          user: existingWithdrawal?.user ?? null,
        });
      });

      let historyData = Array.from(mergedWithdrawals.values());

      if (methodFilter === "manual") {
        historyData = historyData.filter((record) => {
          const payload = record.payload as any;
          return payload?.manual_payout === true;
        });
      } else if (methodFilter === "online") {
        historyData = historyData.filter((record) => {
          const payload = record.payload as any;
          return !payload?.manual_payout;
        });
      }

      historyData.sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );

      if (historyData.length === 0) {
        setWithdrawals([]);
        return;
      }

      if (!isAdmin) {
        setWithdrawals(historyData);
        return;
      }

      const userIds = [...new Set(historyData.map((record) => record.user_id))];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching withdrawal profiles:", profilesError);
      }

      const profilesMap = new Map(profiles?.map((profile) => [profile.id, profile]) || []);

      setWithdrawals(
        historyData.map((record) => ({
          ...record,
          user: profilesMap.get(record.user_id) || null,
        })),
      );
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadge = (withdrawal: Withdrawal) => {
    const payload = withdrawal.payload as any;

    if (payload?.manual_payout === true) {
      return <Badge variant="secondary">Выдано на кассе</Badge>;
    }

    return <Badge variant="default">Онлайн</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="profit-indicator">Завершено</Badge>;
      case "processing":
      case "pending":
        return <Badge className="pending-indicator">Обработка</Badge>;
      case "failed":
      case "cancelled":
        return <Badge className="loss-indicator">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const handleExport = () => {
    const exportData = filteredWithdrawals.map((withdrawal) => {
      const payload = withdrawal.payload as any;

      return {
        ID: withdrawal.id.substring(0, 8),
        Партнер: withdrawal.user?.full_name || "Без имени",
        Email: withdrawal.user?.email || "",
        Сумма: formatKZT(withdrawal.amount_kzt, withdrawal.currency),
        Способ: payload?.manual_payout ? "Касса" : "Онлайн",
        Статус: withdrawal.status,
        Дата: new Date(withdrawal.created_at).toLocaleString("ru-RU"),
        Комментарий: payload?.comment || "",
      };
    });

    downloadCSV(exportData, `withdrawals-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const hasFilters =
    searchQuery || methodFilter !== "all" || statusFilter !== "all" || startDate || endDate;

  return (
    <Card className="financial-card">
      <CardHeader>
        <CardTitle>История выплат</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="search">Поиск партнера</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  className="pl-9"
                  placeholder="Имя или email..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="method">Способ выплаты</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все способы</SelectItem>
                <SelectItem value="online">Онлайн</SelectItem>
                <SelectItem value="manual">Выдано на кассе</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Статус</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="completed">Завершено</SelectItem>
                <SelectItem value="processing">Обработка</SelectItem>
                <SelectItem value="failed">Ошибка</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Дата от</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="startDate"
                className="pl-9"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Дата до</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="endDate"
                className="pl-9"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchQuery("");
                setMethodFilter("all");
                setStatusFilter("all");
                setStartDate("");
                setEndDate("");
              }}
            >
              Сбросить фильтры
            </Button>
          )}

          {showExport && filteredWithdrawals.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Экспорт CSV
            </Button>
          )}
        </div>

        {showStats && filteredWithdrawals.length > 0 && (
          <div className="flex flex-wrap gap-4 rounded-lg bg-muted p-4">
            <div>
              <span className="text-sm text-muted-foreground">Всего выплат:</span>
              <span className="ml-2 font-bold">{stats.count}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Общая сумма:</span>
              <span className="ml-2 font-bold text-primary">{formatKZT(stats.totalAmount)}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Загрузка...</p>
          ) : filteredWithdrawals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Выплаты не найдены</p>
          ) : (
            filteredWithdrawals.map((withdrawal) => {
              const payload = withdrawal.payload as any;

              return (
                <div
                  key={withdrawal.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isAdmin && withdrawal.user && (
                        <span className="font-medium">{withdrawal.user.full_name || "Без имени"}</span>
                      )}
                      {getMethodBadge(withdrawal)}
                      {getStatusBadge(withdrawal.status)}
                    </div>

                    {isAdmin && withdrawal.user?.email && (
                      <p className="text-sm text-muted-foreground">{withdrawal.user.email}</p>
                    )}

                    {payload?.comment && (
                      <p className="text-sm text-muted-foreground">{payload.comment}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>ID: {withdrawal.id.substring(0, 8)}</span>
                      <span>{new Date(withdrawal.created_at).toLocaleString("ru-RU")}</span>
                      {payload?.admin_id && (
                        <span className="text-warning">Выдано админом</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold">{formatKZT(withdrawal.amount_kzt)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
