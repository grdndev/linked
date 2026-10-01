import type { EtatPersiste } from './state';
import type { ReglagesApplication } from '../lib/reglages';
export interface AdminOverview {
  state: EtatPersiste;
  reglages: ReglagesApplication;
  services: {stripe:string;brevo:boolean;colissimo:string};
  accounts: string[];
  boosts: {id:string;listing_id:string;user_id:string;plan:string;days:number;amount:number;status:string;starts_at:string|null;ends_at:string|null}[];
  emails: {id:string;userId:string;subject:string;to:string;attempts:number;status:string}[];
  updatedAt:string;
}
