import { ErreurHttp, erreur, type Env } from '../../../../server/base';
import { servirImage } from '../../../../server/images';
export const onRequestGet:PagesFunction<Env>=async({params,env})=>{
  try {const cle=params.cle;return await servirImage(Array.isArray(cle)?cle.join('/'):String(cle??''),env,true);}
  catch(e){return erreur(e instanceof ErreurHttp?e.status:503,e instanceof ErreurHttp?e.message:'Photo indisponible.');}
};
