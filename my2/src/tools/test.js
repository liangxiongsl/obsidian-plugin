const req = {
    domain: 'https://www.travisblog.asia',
    path: 'search',
    query: 'keywords=%E6%B5%B7%E9%98%94%E5%A4%A9%E7%A9%BA',
    method: 'GET',
    header: {},
    body: {}
}

fetch(`${req.domain}/${req.path}?${req.query}`,
    {
        method: req.method,
        headers: req.header,
        body: req.method === 'GET' ? null : JSON.stringify(req.body),
    }
)
    .then(res => res.json())
    .then(data => console.log(JSON.stringify(data, null, '  ')))