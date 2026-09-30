import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { expandWikiLinks } from "@/lib/wiki";

// react-markdown ne rend jamais de HTML brut et neutralise les liens `javascript:` :
// le contenu écrit par les élèves ne peut pas injecter de script.
export function Markdown({ children, breaks = false }: { children: string; breaks?: boolean }) {
  return (
    <div className="prose-wiki">
      <ReactMarkdown
        remarkPlugins={breaks ? [remarkGfm, remarkBreaks] : [remarkGfm]}
        components={{
          // Seules les images envoyées sur Backstage s'affichent (pas d'image externe : pas de pistage, pas de contenu tiers).
          img: ({ src, alt }) =>
            typeof src === "string" && src.startsWith("/api/wiki/files/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt ?? ""} loading="lazy" />
            ) : (
              <span className="text-muted">[image externe non affichée{alt ? ` : ${alt}` : ""}]</span>
            ),
          a: ({ href, children }) => {
            const external = !!href && /^https?:\/\//i.test(href);
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {children}
              </a>
            );
          },
        }}
      >
        {expandWikiLinks(children)}
      </ReactMarkdown>
    </div>
  );
}
