export interface Env {
	VISITOR_COUNT: KVNamespace;
	NOTION_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;

		// 공통 CORS 헤더
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// 라우팅 처리
		if (pathname.startsWith('/progress')) {
			return handleProgress(url, env, corsHeaders);
		} else if (pathname.startsWith('/visit')) {
			return handleVisit(url, env, corsHeaders);
		} else if (pathname.startsWith('/allowance')) {
			return new Response('Allowance feature not implemented yet', { status: 501 });
		} else {
			return new Response('Not Found', { status: 404 });
		}
	},
};

// 📌 진행도 조회 (Notion API)
async function handleProgress(url: URL, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	const apiKey = url.searchParams.get('api_key');
	const databaseId = url.searchParams.get('database_id');
	const propertyName = url.searchParams.get('property_name') || '상태';
	const condition = url.searchParams.get('condition') || '완료';
	const format = url.searchParams.get('format') || 'json';

	if (!apiKey || !databaseId) {
		return new Response('Missing API Key or Database ID', { status: 400, headers: corsHeaders });
	}

	const notionResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Notion-Version': '2022-06-28',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({}),
	});

	if (!notionResponse.ok) {
		return new Response(`Notion API Error: ${notionResponse.statusText}`, { status: 500, headers: corsHeaders });
	}

	const notionData = (await notionResponse.json()) as any;
	const total = notionData.results.length;
	const completed = notionData.results.filter((page: any) => page.properties[propertyName]?.status?.name === condition).length;
	const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

	const responseData = { total, completed, progress };

	return formatResponse(responseData, format, corsHeaders, 'Progress');
}

// 📌 방문자 수 카운트 (KV 사용)
async function handleVisit(url: URL, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	const databaseId = url.searchParams.get('database_id') || url.searchParams.get('page_id');
	const format = url.searchParams.get('format') || 'json';
	const today = new Intl.DateTimeFormat('fr-CA', {
		timeZone: 'Asia/Seoul',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date());

	const totalKey = `total_visits_${databaseId}`;
	const todayKey = `visits_${databaseId}_${today}`;
	const pagePath = url.searchParams.get('url');
	const pageKey = pagePath ? `visits_${pagePath}` : null;

	async function incrementVisit(key: string) {
		const currentCount = (await env.VISITOR_COUNT.get(key)) || '0';
		const newCount = parseInt(currentCount) + 1;
		await env.VISITOR_COUNT.put(key, newCount.toString());
		return newCount;
	}

	const totalVisits = await incrementVisit(totalKey);
	const todayVisits = await incrementVisit(todayKey);
	const pageVisits = pageKey ? await incrementVisit(pageKey) : null;

	const responseData: any = {
		total: totalVisits,
		today: todayVisits,
	};
	if (pageKey) responseData.page = { url: pagePath, count: pageVisits };

	return formatResponse(responseData, format, corsHeaders, 'Visitors');
}

// 📌 응답 포맷 변환
function formatResponse(data: any, format: string, corsHeaders: HeadersInit, title: string): Response {
	if (format === 'json') {
		return new Response(JSON.stringify(data), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	if (format === 'svg') {
		const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
		  <rect width="100%" height="100%" fill="white" />
		  <text x="10" y="40" font-size="18" fill="black">${title}</text>
		  <text x="10" y="80" font-size="16" fill="black">${JSON.stringify(data)}</text>
		</svg>`;
		return new Response(svg, { headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml' } });
	}

	if (format === 'iframe') {
		const html = `
		<html>
		  <head>
		  <link href="https://cdn.jsdelivr.net/npm/daisyui@4.12.23/dist/full.min.css" rel="stylesheet" type="text/css" />
		  <script src="https://cdn.tailwindcss.com"></script>
			<style>
			  body { font-family: Arial, sans-serif;}
			  @media (prefers-color-scheme: dark) {
			  body {
			 	background-color: #191919 !important; 
			  }
			  }
			</style>
		  </head>
		  <body>
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-title">Total Page Views</div>
					<div class="stat-value text-primary">${data.total.toLocaleString('ko-KR')}</div>
					<div class="stat-desc">Today: ${data.today.toLocaleString('ko-KR')}</div>
				</div>
			</div>
		  </body>
		</html>`;
		return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
	}

	return new Response('Invalid format', { status: 400, headers: corsHeaders });
}
