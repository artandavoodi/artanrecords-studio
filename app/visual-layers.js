import {bootNeuroartanWallpapers} from './neuroartan/assets/js/layers/website/ui/effects/wallpaper-engine.js';

export async function bindVisualLayers(){
 await import('./neuroartan/assets/js/layers/website/ui/effects/shader-core.js');
 await import('./neuroartan/assets/js/layers/website/home/background/home-hero-shader.js');
 bootNeuroartanWallpapers();
 const sync=()=>{
  const root=document.querySelector('[data-neuroartan-wallpaper]');if(!root)return;
  const active=document.documentElement.dataset.homepageThemeCinematicBackground==='true';
  root.dataset.wallpaperMotion=active?'animated':'static';
  if(active)root.__neuroartanWallpaper?.resume();else root.__neuroartanWallpaper?.pause();
 };
 for(const event of ['neuroartan:theme-changed','neuroartan:toggle-changed','neuroartan:homepage-theme-control-changed','neuroartan:homepage-theme-toggles-restored'])document.addEventListener(event,sync);
 sync();
}
