import { NextResponse, type NextRequest } from "next/server";

// Vérification optimiste : sans cookie de session, on renvoie vers /login.
// La vraie vérification (session valide en base) se fait dans requireUser().
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|register|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.*).*)"],
};
