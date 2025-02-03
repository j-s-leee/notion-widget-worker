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
			const svg = `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="100" fill="#f4f4f4" rx="10" />
          <rect width="${progress * 3}" height="100" fill="#4caf50" rx="10" />
          <text x="50%" y="50%" font-size="20" font-family="Arial" fill="#000" dominant-baseline="middle" text-anchor="middle">
            ${progress}% 완료 (${completed}/${total})
          </text>
        </svg>`.trim();

			return new Response(svg, {
				status: 200,
				headers: {
					'Content-Type': 'image/svg+xml',
					'Cache-Control': 'no-cache',
					'Access-Control-Allow-Origin': '*', // CORS 해결
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		} catch (error) {
			// 노션 API 응답 확인
			return new Response(`<svg width="300" height="100"><text x="10" y="50" font-size="20">오류 발생</text></svg>`, {
				status: 500,
				headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' },
			});
		}
	},
};
