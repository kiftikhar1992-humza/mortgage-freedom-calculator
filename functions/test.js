export function onRequest(context) {
  return new Response("Functions are working!", {
    headers: { "Content-Type": "text/plain" }
  });
}
