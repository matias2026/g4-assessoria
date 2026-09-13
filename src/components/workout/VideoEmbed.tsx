import { LinkButton } from "@/components/ui/LinkButton";
import { getVideoEmbedUrl } from "@/lib/video-embed";

interface VideoEmbedProps {
  url: string;
}

/**
 * Vídeo do treino/exercício visto pelo aluno: incorpora o player quando dá
 * pra reconhecer a plataforma (YouTube/Vimeo); qualquer outro link cai
 * para um botão que abre em nova aba, já que não dá pra embutir um domínio
 * qualquer sem saber o formato do player dele.
 */
export function VideoEmbed({ url }: VideoEmbedProps) {
  const embedUrl = getVideoEmbedUrl(url);

  if (!embedUrl) {
    return (
      <LinkButton href={url} target="_blank" rel="noreferrer" variant="secondary" className="mt-3 w-full">
        ▶ Assistir vídeo
      </LinkButton>
    );
  }

  return (
    <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl border border-g4-border">
      <iframe
        src={embedUrl}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Vídeo do treino"
      />
    </div>
  );
}
