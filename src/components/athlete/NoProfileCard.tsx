import { Card, CardTitle } from "@/components/ui/Card";

/**
 * Estado de "sem ficha vinculada" nas telas de Meu perfil — caso raro (conta
 * de aluno sem linha em `alunos`, ou algo que ainda não devia acontecer
 * depois da correção de /solicitar-acesso). Mostrado no lugar do
 * redirect silencioso de antes, que parecia "o clique não fez nada".
 */
export function NoProfileCard() {
  return (
    <Card>
      <CardTitle>Ficha não encontrada</CardTitle>
      <p className="mt-2 text-sm text-g4-muted">
        Não achamos uma ficha de aluno vinculada a esse login. Fale com seu treinador pra resolver.
      </p>
    </Card>
  );
}
