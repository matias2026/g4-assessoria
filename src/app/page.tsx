import { redirect } from "next/navigation";

// A tela de boas-vindas foi fundida com o login (ver /login) — não faz mais
// sentido ter um passo intermediário só com o botão "Entrar" antes do
// formulário de verdade.
export default function HomePage() {
  redirect("/login");
}
