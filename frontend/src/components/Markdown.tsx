import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Loading } from './States';

/** Texto legal versionado em /legal, renderizado sem HTML bruto (SPEC-11 §4). */
export function LegalText({ url }: { url: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['legal', url],
    queryFn: async () => {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('não encontrado');
      return res.text();
    },
    staleTime: Infinity,
  });
  if (isLoading) return <Loading />;
  if (isError || !data)
    return <p role="alert">Não conseguimos abrir este documento agora. Tente de novo.</p>;
  return (
    <div className="legal">
      <ReactMarkdown skipHtml>{data}</ReactMarkdown>
    </div>
  );
}
