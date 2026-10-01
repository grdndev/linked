export const router={push:(path:string)=>window.open(path==='/(tabs)'?'/':path,'_blank','noopener,noreferrer')};
export const useLocalSearchParams=<T,>()=>({section:window.location.hash.slice(1)||'overview'} as T);
export function confirmer(title:string,body:string,button='Confirmer',danger=false):Promise<boolean>{
  return new Promise(resolve=>{
    const previous=document.activeElement as HTMLElement|null;
    const dialog=document.createElement('dialog');dialog.className='confirmation';dialog.setAttribute('aria-labelledby','confirmation-title');
    const heading=document.createElement('h2');heading.id='confirmation-title';heading.textContent=title;
    const text=document.createElement('p');text.textContent=body;
    const actions=document.createElement('div');actions.className='confirmation-actions';
    const cancel=document.createElement('button');cancel.className='button contour';cancel.textContent='Annuler';cancel.autofocus=true;
    const ok=document.createElement('button');ok.className=`button ${danger?'danger':'action'}`;ok.textContent=button;
    const close=(value:boolean)=>{dialog.close();dialog.remove();previous?.focus();resolve(value);};
    cancel.onclick=()=>close(false);ok.onclick=()=>close(true);dialog.oncancel=e=>{e.preventDefault();close(false);};
    actions.append(cancel,ok);dialog.append(heading,text,actions);document.body.append(dialog);dialog.showModal();
  });
}
