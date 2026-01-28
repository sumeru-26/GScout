"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `loginCode=${encodeURIComponent(
      loginCode
    )}; path=/; max-age=${maxAge}`;
    document.cookie = `scouterName=${encodeURIComponent(
      scouterName
    )}; path=/; max-age=${maxAge}`;

    router.push("/");
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
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
