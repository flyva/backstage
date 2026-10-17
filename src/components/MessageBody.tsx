import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// Texte d'un message, avec la mise en forme de l'éditeur (gras, italique, listes, liens). Pas d'image ici : les photos
// passent par les pièces jointes, pas par le texte (évite les images externes non maîtrisées).
export function MessageBody({ children }: { children: string }) {
  if (!children) return null;
  return (
    <div className="prose-wiki">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          img: () => null,
          a: ({ href, children: label }) => {
            const external = !!href && /^https?:\/\//i.test(href);
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {label}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
