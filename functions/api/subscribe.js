export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!env.KIT_API_KEY) {
      return Response.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.convertkit.com/v3/forms/9061333/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: env.KIT_API_KEY,
        email: email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: 'Subscription failed. Please try again.' }, { status: response.status });
    }

    return Response.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscribe error:', error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
