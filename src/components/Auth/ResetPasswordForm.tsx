import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        setHasSession(!!session);
        if (!session) {
          toast.error("Сессия восстановления не найдена", {
            description: "Откройте ссылку из письма заново.",
          });
        }

        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = "";
        cleanUrl.searchParams.delete("code");
        window.history.replaceState({}, document.title, cleanUrl.toString());
      } catch (error: any) {
        toast.error("Ошибка", {
          description:
            error.message ||
            "Не удалось открыть сессию восстановления. Откройте ссылку из письма заново.",
        });
      } finally {
        setSessionReady(true);
      }
    };

    initRecoverySession();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Пароль должен быть не менее 8 символов";
    }
    if (!/[a-zA-Z]/.test(pwd)) {
      return "Пароль должен содержать минимум 1 букву";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Пароль должен содержать минимум 1 цифру";
    }
    return null;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionReady) {
      return;
    }

    if (hasSession === false) {
      toast.error("Сессия восстановления не найдена", {
        description: "Откройте ссылку из письма заново.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Auth session missing!");
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Пароль успешно изменён");
      navigate("/login");
    } catch (error: any) {
      toast.error("Ошибка", {
        description: error.message || "Не удалось изменить пароль",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Новый пароль</CardTitle>
          <CardDescription>
            Создайте надёжный пароль для вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Новый пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 pr-10"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Подтвердите пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                  minLength={8}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Пароль должен содержать:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Минимум 8 символов</li>
                <li>Минимум 1 букву</li>
                <li>Минимум 1 цифру</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !sessionReady || hasSession === false}>
              {loading ? "Сохранение..." : "Сохранить пароль"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
