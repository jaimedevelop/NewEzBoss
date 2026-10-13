import { clientsApiRequest } from '../clients/clientsApi';
export async function getLaunchProjects(): Promise<{success:boolean;data?:any[];error?:unknown}> {
  try { return {success:true,data:await clientsApiRequest('/projects')}; } catch(error) { return {success:false,error}; }
}
