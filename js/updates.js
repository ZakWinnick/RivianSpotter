(() => {
  const controls=document.querySelector('[data-update-controls]');
  if(!controls)return;
  const search=document.getElementById('update-search'),type=document.getElementById('update-type'),kind=document.getElementById('update-kind');
  const cards=[...document.querySelectorAll('[data-update-card]')];
  function filter(){
    const terms=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let count=0;
    for(const card of cards){
      card.hidden=Boolean((type.value&&card.dataset.type!==type.value)||(kind.value&&card.dataset.kind!==kind.value)||terms.some(term=>!card.dataset.search.includes(term)));
      if(!card.hidden)count++;
    }
    for(const day of document.querySelectorAll('[data-update-day]'))day.hidden=![...day.querySelectorAll('[data-update-card]')].some(card=>!card.hidden);
    document.getElementById('update-results').textContent=`${count} location update${count===1?'':'s'}`;
    document.getElementById('updates-empty').hidden=count!==0;
  }
  search.addEventListener('input',filter);type.addEventListener('change',filter);kind.addEventListener('change',filter);
  document.getElementById('update-reset').addEventListener('click',()=>{search.value='';type.value='';kind.value='';filter();search.focus();});
  controls.hidden=false;filter();
})();
