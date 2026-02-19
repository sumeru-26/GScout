"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { QrCodeScanner } from "@/components/qr-code-scanner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <LoginCard />
    </div>
  );
}

function LoginCard() {
  const router = useRouter();
  const [loginCode, setLoginCode] = React.useState("");
  const [scouterName, setScouterName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isFormComplete = Boolean(loginCode.trim() && scouterName.trim());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedLoginCode = loginCode.trim();
    const trimmedScouterName = scouterName.trim();
    if (!trimmedLoginCode || !trimmedScouterName) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/login/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ loginCode: trimmedLoginCode }),
      });

      if (!response.ok) {
        toast.error("Invalid login code");
        return;
      }

      const result = (await response.json()) as {
        valid?: boolean;
        payload?: unknown;
        backgroundImage?: string | null;
      };

      if (!result.valid) {
        toast.error("Invalid login code");
        return;
      }

      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("loginCode", trimmedLoginCode);
      localStorage.setItem("scouterName", trimmedScouterName);
      localStorage.setItem("payload", JSON.stringify(result.payload ?? null));
      localStorage.setItem("backgroundImage", result.backgroundImage ?? "");

      router.push("/scout");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Scouter Login</CardTitle>
        <CardDescription>
          Enter your login code and scouter name to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="login-code">Login Code</Label>
            <Input
              id="login-code"
              name="loginCode"
              placeholder="Enter your code"
              autoComplete="one-time-code"
              value={loginCode}
              onChange={(event) => setLoginCode(event.target.value)}
            />
            <QrCodeScanner onScan={setLoginCode} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scouter-name">Scouter Name</Label>
            <Input
              id="scouter-name"
              name="scouterName"
              placeholder="Your name"
              autoComplete="name"
              value={scouterName}
              onChange={(event) => setScouterName(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            type="submit"
            disabled={!isFormComplete || isSubmitting}
          >
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
