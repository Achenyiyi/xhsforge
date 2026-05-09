import "server-only";

import nodemailer from "nodemailer";

type VerificationScene = "register" | "reset_password";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function resolveFromAddress() {
  return readEnv("SMTP_FROM") || readEnv("SMTP_USER") || "no-reply@xhs-app.local";
}

function buildSubject(scene: VerificationScene) {
  return scene === "register" ? "剽之有道注册验证码" : "剽之有道重置密码验证码";
}

function buildText(code: string, scene: VerificationScene) {
  const action = scene === "register" ? "注册账号" : "重置密码";
  return [
    `你正在${action}，验证码是：${code}`,
    "",
    "验证码 10 分钟内有效，请勿转发给他人。",
    "如果不是你本人操作，可以忽略这封邮件。",
  ].join("\n");
}

export async function sendVerificationEmail(params: {
  to: string;
  code: string;
  scene: VerificationScene;
}) {
  const host = readEnv("SMTP_HOST");
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS");
  const port = Number(readEnv("SMTP_PORT") || "465");
  const secure = readEnv("SMTP_SECURE") !== "false";

  if (!host || !user || !pass) {
    console.warn(
      `[auth] SMTP 未配置，验证码仅输出到服务端日志：${params.to} ${params.scene} ${params.code}`
    );
    return { delivery: "console" as const };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: resolveFromAddress(),
    to: params.to,
    subject: buildSubject(params.scene),
    text: buildText(params.code, params.scene),
  });

  return { delivery: "smtp" as const };
}
