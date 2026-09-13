import { Logo } from "@/components/ui/Logo";
import { AthleteMenu } from "@/components/athlete/AthleteMenu";
import { RoleNav } from "@/components/auth/RoleNav";

interface AthleteHeaderProps {
  athleteName: string;
  talkToCoachLink: string;
  currentPath: string;
  // Só definido quando quem está vendo é o admin numa prévia (sem ficha
  // própria em `alunos`) — repassado pro menu pra manter a modalidade
  // escolhida ao navegar entre as telas de "Meu perfil".
  previewDiscipline?: string;
}

/**
 * Cabeçalho comum a todas as telas da área do aluno (treinos, ficha, senha,
 * relatórios): logo + nome + menu hambúrguer (Treinos/Minha ficha/Alterar
 * senha/Relatórios/Falar com treinador/Sair, tudo num só lugar). Extraído
 * pra não repetir esse bloco em cada página nova de "Meu perfil".
 */
export function AthleteHeader({ athleteName, talkToCoachLink, currentPath, previewDiscipline }: AthleteHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Logo className="h-9 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-g4-muted">Olá,</p>
            <h1 className="truncate text-2xl font-bold text-g4-ink">{athleteName}</h1>
          </div>
        </div>
        <AthleteMenu talkToCoachLink={talkToCoachLink} previewDiscipline={previewDiscipline} />
      </header>

      <RoleNav currentPath={currentPath} />
    </div>
  );
}
