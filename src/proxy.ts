import { NextResponse, type NextRequest } from "next/server";

// /api/gallery est exclu : le proxy met le corps de requête en mémoire (10 Mo max), or on y envoie
// des vidéos en flux. Ces routes vérifient elles-mêmes la session.
// Vérification optimiste : sans cookie de session, on renvoie vers /login.
// La vraie vérification (session valide en base) se fait dans requireUser().
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|register|mot-de-passe-oublie|reinitialiser|api/gallery|api/auth|api/projects|api/cron|sw.js|offline.html|jour-j-offline.html|apple-icon|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.*).*)"],
};
