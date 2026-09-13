// O campo de vídeo (treino geral ou por exercício) é texto livre — o
// treinador cola qualquer link. Aqui só reconhecemos YouTube/Vimeo pra
// gerar uma URL de embed; qualquer outro domínio (ou link inválido) cai
// para null, e quem chama decide o fallback (link "Assistir vídeo").
export function getVideoEmbedUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const shortsMatch = url.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    const embedMatch = url.pathname.match(/^\/embed\/([\w-]+)/);
    if (embedMatch) return rawUrl;
    return null;
  }

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "vimeo.com") {
    const id = url.pathname.slice(1).split("/")[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}
