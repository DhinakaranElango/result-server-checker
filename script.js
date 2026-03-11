const servers=[

{
name:"Result Server",
url:"https://coe.annauniv.edu/home/index.php"
},
];

async function checkServers(){

const container=document.getElementById("servers");
const loading=document.getElementById("loading");

container.innerHTML="";
loading.innerHTML="Checking servers...";

for(const server of servers){

const start=Date.now();

let status="DOWN";
let statusClass="down";
let ping="--";

try{

await fetch(server.url,{mode:"no-cors"});

const end=Date.now();

ping=end-start;

status="ONLINE";
statusClass="online";

}catch(e){}

container.innerHTML+=`

<div class="server-card">

<div class="server-name">${server.name}</div>

<div class="status ${statusClass}">
${status}
</div>

<div class="ping">
Response Time: ${ping} ms
</div>

</div>

`;

}

loading.innerHTML="";

}

checkServers();

setInterval(checkServers,30000);