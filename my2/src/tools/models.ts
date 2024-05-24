export class Request{
    domain: string
    method: string
    path: string
    query: string
    header: Record<string, string>
    body: Record<string, any>
    constructor(domain: string,method: string,path: string,query: string,header: Record<string, string>,body: Record<string, any>) {
        this.domain=domain
        this.method=method
        this.path=path
        this.query=query
        this.header=header
        this.body=body
    }
}