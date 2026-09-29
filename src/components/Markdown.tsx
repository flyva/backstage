import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { expandWikiLinks } from "@/lib/wiki";

// react-markdown ne rend jamais de HTML brut et neutralise les liens `javascript:` :
// le contenu écrit par les élèves ne peut pas injecter de script.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-wiki">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
