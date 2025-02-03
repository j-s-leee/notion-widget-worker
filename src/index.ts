export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const apiKey = url.searchParams.get('api_key');
		const databaseId = url.searchParams.get('database_id');
		const propertyName = url.searchParams.get('property_name');
		const condition = url.searchParams.get('condition');

		// API 키와 데이터베이스 ID가 없으면 오류 반환
		if (!apiKey || !databaseId || !propertyName || !condition) {
			return new Response(JSON.stringify({ error: 'Missing api_key or database_id or property_name or condition' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const notionApiUrl = `https://api.notion.com/v1/databases/${databaseId}/query`;

		const response = await fetch(notionApiUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'Notion-Version': '2022-06-28',
			},
			body: JSON.stringify({}),
		});

		const data = (await response.json()) as any;

		// 노션 API 응답 확인
		if (!data.results) {
			return new Response(JSON.stringify({ error: 'Invalid Notion API response' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// "완료" 상태인 항목 개수 계산
		const items = data.results;
		const total = items.length;
		const completed = items.filter((item: any) => item.properties[`${propertyName}`].status.name === `${condition}`).length;

		// 진행도 퍼센트 계산
		const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

		return new Response(JSON.stringify({ total, completed, progress }), {
			headers: { 'Content-Type': 'application/json' },
		});
	},
};
