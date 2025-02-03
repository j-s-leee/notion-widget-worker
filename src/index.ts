export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		}
		try {
			const url = new URL(request.url);
			const apiKey = url.searchParams.get('api_key');
			const databaseId = url.searchParams.get('database_id');
			const propertyName = url.searchParams.get('property_name');
			const condition = url.searchParams.get('condition');

			// API 키와 데이터베이스 ID가 없으면 오류 반환
			if (!apiKey || !databaseId || !propertyName || !condition) {
				return new Response(JSON.stringify({ error: 'Missing api_key or database_id or property_name or condition' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
				});
			}

			const notionApiUrl = `https://api.notion.com/v1/databases/${databaseId}/query`;

			const response = await fetch(notionApiUrl, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
					'Notion-Version': '2022-06-28',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
				body: JSON.stringify({}),
			});

			const data = (await response.json()) as any;

			// "완료" 상태인 항목 개수 계산
			const items = data.results;
			const total = items.length;
			const completed = items.filter((item: any) => item.properties[`${propertyName}`].status.name === `${condition}`).length;
			const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
			const html = `
		<!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              background-color: #f4f4f4;
              border-radius: 10px;
              padding: 20px;
              width: 300px;
              height: 100px;
            }
            .progress-container {
              width: 100%;
              background-color: #ddd;
              border-radius: 5px;
              overflow: hidden;
            }
            .progress-bar {
              width: ${progress}%;
              height: 20px;
              background-color: #4caf50;
              text-align: center;
              line-height: 20px;
              color: white;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h3>진행도: ${progress}% (${completed}/${total})</h3>
          <div class="progress-container">
            <div class="progress-bar">${progress}%</div>
          </div>
        </body>
        </html>
		`;

			return new Response(html, {
				status: 200,
				headers: {
					'Content-Type': 'text/html',
					'Cache-Control': 'no-cache',
					'Access-Control-Allow-Origin': '*', // CORS 해결
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		} catch (error) {
			// 노션 API 응답 확인
			return new Response(`<h3>오류 발생</h3>`, {
				status: 500,
				headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' },
			});
		}
	},
};
