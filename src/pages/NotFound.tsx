import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();
  const requestedPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", requestedPath);
  }, [requestedPath]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-xl border-slate-200 shadow-lg">
        <CardContent className="p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">MG-Market</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">404</h1>
          <p className="mt-4 text-xl text-slate-700">Oops! Page not found</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Приложение открылось по пути, которого сейчас нет в роутере.
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Текущий путь
            </p>
            <code className="mt-2 block break-all text-sm text-slate-900">{requestedPath}</code>
          </div>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/">На главную</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/login">Войти</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/dashboard">Открыть кабинет</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
