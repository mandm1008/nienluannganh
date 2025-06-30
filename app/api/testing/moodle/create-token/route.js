import { NextResponse } from 'next/server';

export async function GET(req) {
    const moodleToken = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
    const moodleBaseUrl = process.env.MOODLE_URL;
    const apiUrl = `${moodleBaseUrl}/local/cloudsupport/create_token.php`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body:  JSON.stringify({
      main_token: 'changeme',
    }),
  });

  console.log(response);

  const data = await response.json();

  return NextResponse.json({ data }, { status: 200 });
}
