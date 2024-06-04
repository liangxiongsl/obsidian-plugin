import {Octokit} from "octokit"

let token = 'WjJod1gwbHBRelZQUTFWdlVrTnZaM0pXTTNwMllucGlkRzFNWm5saWJHZzFVakpKVFZBemNBPT0='
let octokit = new Octokit({auth: atob(atob(token))})
octokit.hook.before('request',async (options: any)=>{
	// console.log(options)
})
octokit.hook.after('request', async (response: any, options: any)=>{
	// console.log(response, options)
})


export const git = octokit.rest
export const repos = octokit.rest.repos
