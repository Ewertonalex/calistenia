var OP = {
  weeks: [
    null,
    { name: "Adaptação", level: "Leve", line: "Aprender o movimento, respirar e criar o hábito." },
    { name: "Construção", level: "Moderada", line: "Quando a forma estiver boa, faça 2 repetições a mais." },
    { name: "Resistência", level: "Moderada+", line: "Prancha mais longa e bicicleta com mais disposição." },
    { name: "Evolução", level: "Progressiva", line: "Aumente aos poucos, sem chegar à exaustão." }
  ],
  weights: [
    { id: "0", label: "Início", hint: "Peso do dia 1", short: "Início" },
    { id: "1", label: "Semana 1", hint: "Depois do 7º dia", short: "S1" },
    { id: "2", label: "Semana 2", hint: "Depois do 14º dia", short: "S2" },
    { id: "3", label: "Semana 3", hint: "Depois do 21º dia", short: "S3" },
    { id: "4", label: "Dia 30", hint: "Peso do fechamento", short: "D30" }
  ],
  exercises: {
    bike: {
      name: "Bicicleta",
      cue: "Banco na altura do quadril. No ponto de baixo, o joelho fica levemente dobrado. Ombros soltos e coluna neutra.",
      video: "NwwDBARCGgo",
      videoTitle: "Como usar a bicicleta ergométrica",
      videoNote: "Vídeo em inglês: mostra a altura do banco e a postura. O ritmo de hoje está escrito no treino.",
      search: "como pedalar na bicicleta ergométrica iniciante"
    },
    incline: {
      name: "Flexão inclinada",
      cue: "Mãos na parede ou numa mesa firme, um pouco mais abertas que os ombros. Corpo reto, peito desce na direção do apoio e você empurra de volta.",
      video: "gvoTIZGmcFY",
      videoTitle: "Como fazer flexão inclinada",
      videoNote: "",
      search: "flexão inclinada na parede ou mesa como fazer"
    },
    kneePush: {
      name: "Flexão com joelhos",
      cue: "Joelhos no chão e corpo reto da cabeça aos joelhos. Desça o peito e empurre. Cotovelos apontam para trás, não abertos para os lados.",
      video: "rsbq8DwZEGg",
      videoTitle: "Flexão com joelhos apoiados",
      videoNote: "",
      search: "flexão de braço com joelhos apoiados"
    },
    plank: {
      name: "Prancha com joelhos",
      cue: "Joelhos e mãos no chão. Corpo reto, abdômen firme. Não deixe o quadril cair nem subir. Respire durante a sustentação.",
      video: "FoViT_cIPQg",
      videoTitle: "Prancha ajoelhada",
      videoNote: "",
      search: "prancha com joelhos apoiados como fazer"
    },
    squat: {
      name: "Agachamento",
      cue: "Pés na largura do quadril. Mande o quadril para trás, como se fosse sentar. Os joelhos acompanham a ponta dos pés.",
      video: "CaTbpJH49i4",
      videoTitle: "Agachamento para iniciante",
      videoNote: "O vídeo explica o movimento com barra. Faça sem peso, só com o corpo.",
      search: "agachamento com peso do corpo para iniciante"
    },
    calf: {
      name: "Elevação de panturrilha",
      cue: "Em pé, segure numa parede se precisar. Suba na ponta dos pés, pause em cima e desça devagar.",
      video: "pJ4JFIajxFs",
      videoTitle: "Panturrilha em pé",
      videoNote: "",
      search: "elevação de panturrilha em pé como fazer"
    },
    bridge: {
      name: "Ponte de glúteos",
      cue: "Deite com os joelhos dobrados e os pés no chão. Empurre os calcanhares, suba o quadril e aperte os glúteos. Não arqueie a lombar.",
      video: "MmSS_G86rfk",
      videoTitle: "Ponte de glúteos",
      videoNote: "O primeiro exercício do vídeo é a ponte. Suba até o joelho, o quadril e o ombro ficarem alinhados.",
      search: "ponte de glúteos como fazer no chão"
    },
    crunch: {
      name: "Abdominal curto",
      cue: "Deite com os joelhos dobrados. Suba só os ombros. A lombar continua no chão. Não puxe o pescoço.",
      video: "KiKZsrjYuU4",
      videoTitle: "Abdominal curto no solo",
      videoNote: "",
      search: "abdominal curto no solo como fazer"
    },
    deadbug: {
      name: "Dead bug",
      cue: "Deite, braços para o teto e joelhos a 90 graus. Desça um braço e a perna oposta ao mesmo tempo. A lombar fica colada no chão.",
      video: "4XLEnwUr1d8",
      videoTitle: "Dead bug",
      videoNote: "Narração em inglês. O ponto principal é não deixar a lombar sair do chão.",
      search: "dead bug exercício abdominal como fazer"
    },
    march: {
      name: "Polichinelo sem salto",
      cue: "Marche no lugar, sem sair do chão em salto. Os joelhos sobem, os braços acompanham e o tronco fica ereto.",
      video: "7U8FMLlwItc",
      videoTitle: "Marcha no lugar",
      videoNote: "Vídeo em inglês. A marcha sem salto aparece logo no começo.",
      search: "marcha no lugar sem pulo exercício"
    },
    mobility: {
      name: "Mobilidade",
      cue: "Em pé, faça círculos lentos com os ombros. Depois, mãos na cintura e círculos com o quadril. Movimento confortável, sem dor.",
      video: "TDo4HU60IXY",
      videoTitle: "Mobilidade de quadril e ombros",
      videoNote: "Vídeo em inglês, em ritmo lento. Use só a amplitude que não dói.",
      search: "mobilidade de quadril e ombros para iniciante"
    },
    stretch: {
      name: "Alongamento leve",
      cue: "Alongue peito, posterior da coxa e quadril. Segure cada posição sem dor, respirando fundo.",
      video: "TDo4HU60IXY",
      videoTitle: "Alongamento leve",
      videoNote: "Vídeo em inglês. Não force a posição.",
      search: "alongamento leve para iniciante em casa"
    },
    walk: {
      name: "Caminhada tranquila",
      cue: "Caminhe pela casa sem pressa. Se preferir, pedale no ritmo mais leve da bicicleta.",
      video: "NwwDBARCGgo",
      videoTitle: "Caminhada ou pedal leve",
      videoNote: "Se for pedalar, fica no ritmo em que a conversa sai fácil.",
      search: "caminhada leve em casa"
    }
  },
  workouts: [
    {
      title: "Recuperação",
      focus: "Mobilidade, alongamento e caminhada",
      blocks: [
        { ex: "mobility", sec: 300, dose: { kind: "note", text: "Círculos lentos de ombro e de quadril. Sem forçar." } },
        { ex: "stretch", sec: 300, dose: { kind: "note", text: "Segure cada alongamento cerca de 20 segundos, sem dor." } },
        { ex: "walk", label: "Caminhada ou pedal bem leve", sec: 300, dose: { kind: "note", text: "Sem buscar cansaço. Hoje é para recuperar." } }
      ]
    },
    {
      title: "Peito, braços e ombros",
      focus: "Força de cima e bicicleta",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "incline", sec: 120, dose: { kind: "note", text: "Séries curtas na parede ou na mesa. Descanse entre elas.", progress: true } },
        { ex: "kneePush", sec: 120, dose: { kind: "note", text: "Séries curtas, com os joelhos no chão. Descanse entre elas.", progress: true } },
        { ex: "plank", sec: 120, dose: { kind: "plank" } },
        { ex: "bike", label: "Bicicleta moderada", sec: 300, dose: { kind: "bike", level: "moderada" } },
        { ex: "bike", label: "Pedalada leve", sec: 120, dose: { kind: "bike", level: "solta" } }
      ]
    },
    {
      title: "Pernas e glúteos",
      focus: "Força de baixo e bicicleta",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "squat", sec: 120, dose: { kind: "sets", sets: 2, reps: 10 } },
        { ex: "calf", sec: 120, dose: { kind: "sets", sets: 2, reps: 12 } },
        { ex: "bridge", sec: 120, dose: { kind: "sets", sets: 2, reps: 10 } },
        { ex: "bike", label: "Bicicleta moderada", sec: 300, dose: { kind: "bike", level: "moderada" } },
        { ex: "bike", label: "Pedalada leve", sec: 120, dose: { kind: "bike", level: "solta" } }
      ]
    },
    {
      title: "Abdômen e core",
      focus: "Centro do corpo e bicicleta",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "crunch", sec: 120, dose: { kind: "sets", sets: 2, reps: 10 } },
        { ex: "deadbug", sec: 120, dose: { kind: "sets", sets: 2, reps: 8 } },
        { ex: "plank", sec: 120, dose: { kind: "plank" } },
        { ex: "bike", label: "Bicicleta moderada", sec: 300, dose: { kind: "bike", level: "moderada" } },
        { ex: "bike", label: "Pedalada leve", sec: 120, dose: { kind: "bike", level: "solta" } }
      ]
    },
    {
      title: "Condicionamento",
      focus: "Bicicleta e movimento contínuo",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "bike", label: "Intervalos na bicicleta", sec: 360, dose: { kind: "interval" } },
        { ex: "march", sec: 120, dose: { kind: "note", text: "Sem salto. Marche no ritmo em que ainda consegue falar." } },
        { ex: "squat", label: "Agachamento leve", sec: 120, dose: { kind: "note", text: "Desça pouco e sem pressa, só para soltar as pernas.", progress: true } },
        { ex: "bike", label: "Bicicleta leve", sec: 180, dose: { kind: "bike", level: "leve" } }
      ]
    },
    {
      title: "Corpo inteiro",
      focus: "Força geral e bicicleta",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 120, dose: { kind: "bike", level: "leve" } },
        { ex: "incline", sec: 120, dose: { kind: "note", text: "Séries curtas. Descanse entre elas.", progress: true } },
        { ex: "squat", sec: 120, dose: { kind: "note", text: "Séries curtas. Quadril para trás e joelhos na direção dos pés.", progress: true } },
        { ex: "bridge", sec: 120, dose: { kind: "note", text: "Séries curtas. Aperte os glúteos no alto.", progress: true } },
        { ex: "deadbug", sec: 120, dose: { kind: "note", text: "Séries curtas. Lombar colada no chão.", progress: true } },
        { ex: "bike", label: "Bicicleta moderada", sec: 180, dose: { kind: "bike", level: "moderada" } },
        { ex: "bike", label: "Pedalada leve", sec: 120, dose: { kind: "bike", level: "solta" } }
      ]
    },
    {
      title: "Resistência e mobilidade",
      focus: "Pedal contínuo e soltura",
      blocks: [
        { ex: "bike", label: "Bicicleta leve", sec: 180, dose: { kind: "bike", level: "leve" } },
        { ex: "bike", label: "Bicicleta em ritmo confortável", sec: 480, dose: { kind: "bike", level: "conforto" } },
        { ex: "mobility", sec: 120, dose: { kind: "note", text: "Quadril e ombros, em círculos lentos." } },
        { ex: "stretch", sec: 120, dose: { kind: "note", text: "Alongue sem dor e respire fundo." } }
      ]
    }
  ]
};

(function () {
  OP.workouts.forEach(function (workout, index) {
    var sum = workout.blocks.reduce(function (total, block) { return total + block.sec; }, 0);
    if (sum !== 900) console.warn("Treino", index, "não soma 15 min:", sum);
  });
})();
