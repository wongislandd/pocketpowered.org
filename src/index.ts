const jsonHeaders = {
  "cache-control": "public, max-age=60, stale-while-revalidate=300",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
} satisfies HeadersInit;

function publicConfig(env: Env) {
  return {
    android: {
      groupUrl: "/sidequests/go/android-group",
      playUrl: "/sidequests/go/android",
      status: env.ANDROID_STATUS,
    },
    ios: {
      testFlightUrl: env.IOS_TESTFLIGHT_URL ? "/sidequests/go/ios" : null,
      status: env.IOS_STATUS,
    },
    guideUrl: "/sidequests/go/guide",
  };
}

function temporaryRedirect(request: Request, destination: string | undefined) {
  if (!destination) {
    const fallback = new URL("/sidequests/?ios=pending#access", request.url);
    return Response.redirect(fallback, 302);
  }

  return Response.redirect(destination, 302);
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/sidequests/config.json") {
      return Response.json(publicConfig(env), { headers: jsonHeaders });
    }

    if (url.pathname === "/sidequests/go/android-group") {
      return temporaryRedirect(request, env.ANDROID_GROUP_URL);
    }

    if (url.pathname === "/sidequests/go/android") {
      return temporaryRedirect(request, env.ANDROID_PLAY_URL);
    }

    if (url.pathname === "/sidequests/go/ios") {
      return temporaryRedirect(request, env.IOS_TESTFLIGHT_URL || undefined);
    }

    if (url.pathname === "/sidequests/go/guide") {
      return temporaryRedirect(request, env.EARLY_ACCESS_GUIDE_URL);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
