(function(){
'use strict';
var H=3600, D=86400;
var todos=[], meta={}, mcDisp=false;
function $(id){return document.getElementById(id);}
function el(t,txt,cls){var e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e;}
function agora(){return Math.floor(Date.now()/1000);}
function idade(v){if(!v)return null;return agora()-v;}
function rel(v){var s=idade(v);if(s==null)return 'sem registro';if(s<0)s=0;
  if(s<90)return 'agora há pouco';if(s<5400)return Math.round(s/60)+' min atrás';
  if(s<2*D)return Math.round(s/H)+' h atrás';return Math.round(s/D)+' dias atrás';}
function faixa(n){var s=idade(n.v);if(s==null)return 'velho';if(s<=H)return 'on';if(s<=D)return 'dia';return 'velho';}
var COR={on:'#16a34a',dia:'#f59e0b',velho:'#9ca3af'};
function dh(ep){if(!ep)return '';var d=new Date(ep*1000);
  return d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' (Brasília)';}

// abas
var abas=document.querySelectorAll('.abas button');
function abre(nome){abas.forEach(function(b){b.classList.toggle('ativa',b.dataset.aba===nome);});
  document.querySelectorAll('.aba').forEach(function(s){s.classList.toggle('ativa',s.id==='aba-'+nome);});
  if(nome==='mapa'&&mapa)setTimeout(function(){mapa.invalidateSize();},50);
  if(history.replaceState)history.replaceState(null,'','#'+nome);}
abas.forEach(function(b){b.addEventListener('click',function(){abre(b.dataset.aba);});});

// mapa
var mapa=L.map('mapa',{preferCanvas:true}).setView([-14.5,-52],4);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© OpenStreetMap'}).addTo(mapa);
var camada=L.layerGroup().addTo(mapa);

function popup(n){var d=el('div');var t=el('strong',n.n);d.appendChild(t);
  function lin(r,v){if(v){d.appendChild(el('br'));d.appendChild(document.createTextNode(r+': '+v));}}
  lin('Rede',n.t==='meshcore'?'MeshCore':'Meshtastic');
  lin('Local',[n.m,n.uf].filter(Boolean).join(' - '));
  lin('Último contato',rel(n.v));
  lin('Placa',n.hw);lin('Papel',n.f);lin('Região',n.r);if(n.fr)lin('Frequência',String(n.fr).replace('.',',')+' MHz');lin('Preset',n.p);lin('Firmware',n.fw);
  if(n.c)lin('Nome curto',n.c);
  return d;}

function filtrados(){
  var rede=$('f-rede').value,uf=$('f-uf').value,at=$('f-ativ').value,q=$('f-busca').value.trim().toLowerCase();
  return todos.filter(function(n){
    if(rede!=='todas'&&n.t!==rede)return false;
    if(uf&&n.uf!==uf)return false;
    var s=idade(n.v);
    if(at==='1h'&&!(s!=null&&s<=H))return false;
    if(at==='24h'&&!(s!=null&&s<=D))return false;
    if(q&&(n.n+' '+n.m+' '+n.i+' '+n.c).toLowerCase().indexOf(q)<0)return false;
    return true;});}

function desenha(){camada.clearLayers();var lst=filtrados();
  lst.forEach(function(n){var f=faixa(n);var mc=n.t==='meshcore';
    var m=L.circleMarker([n.la,n.lo],{radius:f==='on'?7:5,color:mc?'#2563eb':'#333',weight:mc?3:1,fillColor:COR[f],fillOpacity:.85});
    m.bindPopup(function(){return popup(n);});m.addTo(camada);});
  $('f-busca').title=lst.length+' nós no mapa';}

function contagem(lst){var r={tot:lst.length,h1:0,h24:0};
  lst.forEach(function(n){var s=idade(n.v);if(s!=null&&s<=H)r.h1++;if(s!=null&&s<=D)r.h24++;});return r;}

function cartoes(){var c=$('cartoes');c.textContent='';
  var mt=todos.filter(function(n){return n.t==='meshtastic';}),mc=todos.filter(function(n){return n.t==='meshcore';});
  var a=contagem(todos);
  function add(v,t){var x=el('div',null,'cartao');x.appendChild(el('b',String(v)));x.appendChild(el('span',t));c.appendChild(x);}
  add(a.h1,'online agora (1 h)');add(a.h24,'ouvidos em 24 h');add(a.tot,'nós no mapa');
  add(mt.length,'Meshtastic');add(mcDisp?mc.length:'em breve','MeshCore');}

function ufs(){var s={};todos.forEach(function(n){if(n.uf)s[n.uf]=1;});return Object.keys(s).sort();}
function preencheUF(sel){var l=ufs();l.forEach(function(u){var o=el('option',u);o.value=u;sel.appendChild(o);});}

function online(){var tb=document.querySelector('#tab-online tbody');tb.textContent='';
  var lim=$('o-janela').value==='1h'?H:D,uf=$('o-uf').value;
  var lst=todos.filter(function(n){var s=idade(n.v);return s!=null&&s<=lim&&(!uf||n.uf===uf);}).sort(function(a,b){return b.v-a.v;});
  lst.slice(0,500).forEach(function(n){var tr=el('tr');
    [n.n,n.t==='meshcore'?'MeshCore':'Meshtastic',[n.m,n.uf].filter(Boolean).join(' - '),n.hw,n.f,rel(n.v)].forEach(function(v){tr.appendChild(el('td',v||'-'));});
    tb.appendChild(tr);});
  $('o-resumo').textContent=lst.length+' nós'+(lst.length>500?' (mostrando os 500 mais recentes)':'')+'.';}

function estados(){var tb=document.querySelector('#tab-estados tbody');tb.textContent='';
  var m={};todos.forEach(function(n){var u=n.uf||'?';var x=m[u]||(m[u]={uf:u,tot:0,h1:0,h24:0,mt:0,mc:0});
    x.tot++;if(n.t==='meshcore')x.mc++;else x.mt++;var s=idade(n.v);if(s!=null&&s<=H)x.h1++;if(s!=null&&s<=D)x.h24++;});
  Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.tot-a.tot;}).forEach(function(x){
    var tr=el('tr',null,'clic');
    [x.uf==='?'?'sem UF':x.uf,x.tot,x.h1,x.h24,x.mt,mcDisp?x.mc:'-'].forEach(function(v,i){var td=el('td',String(v));if(i>0)td.className='num';tr.appendChild(td);});
    tr.addEventListener('click',function(){if(x.uf!=='?'){$('f-uf').value=x.uf;desenha();abre('mapa');
      var p=todos.filter(function(n){return n.uf===x.uf;}).map(function(n){return [n.la,n.lo];});if(p.length)mapa.fitBounds(p,{maxZoom:9,padding:[20,20]});}});
    tb.appendChild(tr);});}

function regioes(){var c={};todos.filter(function(n){return n.t==='meshtastic'&&n.r;}).forEach(function(n){c[n.r]=(c[n.r]||0)+1;});
  var p=$('regiao-dados');var anz=c.ANZ||0,br=c.BR_902||0;
  p.textContent='No mapa, entre os nós Meshtastic que informam a região: '+anz+' usam ANZ e '+br+' usam BR_902 (dados de '+dh(meta.mt)+'). Muitos nós não informam a região.';}

function freqmc(){var c={},t=0;todos.filter(function(n){return n.t==='meshcore'&&n.fr;}).forEach(function(n){c[n.fr]=(c[n.fr]||0)+1;t++;});
  var p=$('mc-dados');if(!t){p.textContent='A contagem de frequências do MeshCore aparece aqui quando a coleta estiver disponível.';return;}
  var k=Object.keys(c).sort(function(a,b){return c[b]-c[a];}).slice(0,3).map(function(f){return c[f]+' em '+String(f).replace('.',',')+' MHz';});
  p.textContent='No mapa MeshCore ('+t+' nós com frequência informada): '+k.join('; ')+'. Combine os parâmetros com a comunidade local antes de ligar.';}
function tudo(){freqmc();cartoes();desenha();online();estados();regioes();}

['f-rede','f-uf','f-ativ'].forEach(function(i){$(i).addEventListener('change',desenha);});
$('f-busca').addEventListener('input',desenha);
$('o-janela').addEventListener('change',online);$('o-uf').addEventListener('change',online);

function carrega(url){return fetch(url+'?t='+Math.floor(Date.now()/60000)).then(function(r){if(!r.ok)throw new Error(url);return r.json();});}
Promise.all([carrega('data/nos_meshtastic.json'),carrega('data/nos_meshcore.json').catch(function(){return {nos:[],disponivel:false};})])
.then(function(r){var a=r[0],b=r[1];meta.mt=a.atualizado;meta.mc=b.atualizado;mcDisp=!!b.disponivel;
  todos=(a.nos||[]).concat(b.nos||[]);
  preencheUF($('f-uf'));preencheUF($('o-uf'));tudo();
  $('atualiza').textContent='Dados de '+dh(meta.mt)+'. A página confere de novo a cada visita.';
  var h=(location.hash||'').replace('#','');if(h&&document.getElementById('aba-'+h))abre(h);
  setInterval(function(){cartoes();desenha();online();},60000);
  iniciaPresenca();iniciaForm();})
.catch(function(){$('atualiza').textContent='Não consegui carregar os dados agora. Tente de novo em instantes.';});

function cfg(){return window.__MDC||null;}
function visId(){try{var k='mdc_vid',v=sessionStorage.getItem(k);if(!v){v=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem(k,v);}return v;}catch(e){return String(Date.now());}}
function ntfy(path,opt){var c=cfg();if(!c||!c.n)return Promise.reject();return fetch(c.n+'/'+path,opt||{});}
function pulso(){var c=cfg();if(!c||!c.p)return;
  ntfy(c.p,{method:'POST',headers:{'Title':'','Priority':'min','TTL':'10m'},body:'v1:'+visId()}).catch(function(){});}
function contaVendo(){var c=cfg();if(!c||!c.p)return;
  ntfy(c.p+'/json?poll=1&since=10m').then(function(r){return r.ok?r.text():'';}).then(function(t){
    var ids={},corte=agora()-600;
    String(t).split('\n').forEach(function(lin){if(!lin)return;try{var m=JSON.parse(lin);var b=String(m.message||'');var tm=m.time||0;
      if(tm>=corte&&b.indexOf('v1:')===0)ids[b]=1;}catch(e){}});
    var n=Object.keys(ids).length,el=$('vendo');
    if(!n){el.hidden=true;return;}
    el.hidden=false;el.textContent=n===1?'1 pessoa vendo agora':(n+' pessoas vendo agora');
  }).catch(function(){});}
function iniciaPresenca(){if(!cfg()||!cfg().p)return;pulso();contaVendo();setInterval(pulso,7*60*1000);setInterval(contaVendo,40*1000);}
function iniciaForm(){var c=cfg(),form=$('form-contato');if(!form)return;
  if(!c||!c.f){$('form-status').textContent='O envio ainda não está disponível.';form.querySelector('button').disabled=true;return;}
  var t0=Date.now();
  form.addEventListener('submit',function(ev){ev.preventDefault();
    var st=$('form-status'),btn=$('form-enviar');
    var nome=(form.nome.value||'').trim().slice(0,80);
    var msg=(form.mensagem.value||'').trim().slice(0,1000);
    if(form.website.value){st.textContent='Mensagem enviada. Obrigado!';form.reset();return;}
    if(msg.length<3){st.textContent='Escreva uma mensagem (pelo menos 3 caracteres).';return;}
    if(Date.now()-t0<8000){st.textContent='Aguarde uns segundos e envie de novo.';return;}
    try{var ult=parseInt(localStorage.getItem('mdc_form_ts')||'0',10);if(Date.now()-ult<5*60*1000){st.textContent='Aguarde alguns minutos antes de enviar outra mensagem.';return;}}catch(e){}
    btn.disabled=true;st.textContent='Enviando…';
    var corpo=(nome?nome+':\n':'')+msg;
    ntfy(c.f,{method:'POST',headers:{'Title':'Comentário · Malha do Cerrado','Priority':'default','Tags':'mailbox_with_mail'},body:corpo})
      .then(function(r){if(!r.ok)throw new Error('falha');try{localStorage.setItem('mdc_form_ts',String(Date.now()));}catch(e){}
        st.textContent='Mensagem enviada. Obrigado!';form.reset();})
      .catch(function(){st.textContent='Não consegui enviar agora. Tente de novo em instantes.';})
      .then(function(){btn.disabled=false;});
  });}
})();
