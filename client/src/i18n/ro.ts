// Română
import type { Dict } from "./en";

export const ro: Dict = {
  // start screen
  "lobby.namePlaceholder": "Numele tău",
  "lobby.create": "Creează joc",
  "lobby.join": "Intră în joc",
  "lobby.joinFailed": "Nu ai putut intra — jocul poate fi plin sau închis. Poți porni unul propriu cu „Creează joc”.",
  "lobby.serverDown": "Serverul de la {url} nu răspunde. Este pornit?",
  "lobby.invalidCharacter": "Acest personaj nu este valid. Folosește toate punctele (fiecare atribut 1–10).",
  "lobby.spendFirst": "Folosește mai întâi toate punctele (au rămas {n})",
  "lobby.friendlyFire": "Foc prietenesc",
  "lobby.friendlyFireHint": "Pornit: iepurașii se pot răni între ei. Oprit: doar animalele te pot răni.",
  "join.ffOn": "Focul prietenesc este PORNIT: alți iepurași te pot răni. În primele 10 secunde ești în siguranță.",
  "join.ffOff": "Focul prietenesc este OPRIT: iepurașii nu se pot răni între ei.",
  "lobby.language": "Limba",

  // character creation
  "creation.stats": "Atribute",
  "creation.pointsLeft": "Puncte rămase:",
  "creation.preview": "Viață {hp} · Atac {attack} · Apărare {defense} (cu sabia) · Viteză {speed}%",

  // stats
  "stat.strength": "Forță",
  "stat.agility": "Agilitate",
  "stat.intelligence": "Inteligență",
  "stat.charm": "Farmec",
  "stat.endurance": "Rezistență",
  "stat.luck": "Noroc",
  "statHelp.strength": "Influențează atacul",
  "statHelp.agility": "Influențează atacul, apărarea și viteza de deplasare",
  "statHelp.intelligence": "Îți face vrăjile mai puternice, îți dă mai multe locuri pentru vrăji și le face să dureze mai mult",
  "statHelp.charm": "Va conta mai târziu",
  "statHelp.endurance": "Influențează viața, energia (oboseala) și cât de repede îți revii",
  "statHelp.luck": "Loviturile norocoase și parările norocoase apar mai des",

  // HUD windows
  "window.hint": "Clic sau apasă {key} pentru a minimiza · trage pentru a muta · clic dreapta readuce fereastra la locul ei",
  "window.map": "Hartă",
  "window.inventory": "Inventar",
  "window.outfit": "Echipament",
  "window.stats": "Atribute",
  "window.spellbook": "Carte de vrăji",

  // inventory
  "inv.filter": "filtru…",
  "inv.name": "Nume",
  "inv.type": "Tip",
  "inv.empty": "Niciun obiect",
  "inv.equippedIn": "Echipat: {slot}",
  "inv.rowHint":
    "Clic pe el, apoi Shift+E ca să-l porți sau Shift+1..N pentru un loc din bara rapidă\nSau trage-l pe un loc · dublu clic: locul selectat din bara rapidă\nClic dreapta: folosește (mănâncă) · E: folosește locul selectat din bara rapidă",

  // item types
  "type.weapon": "Armă",
  "type.armor": "Armură",
  "type.clothes": "Haine",
  "type.potion": "Poțiune",
  "type.food": "Mâncare",
  "type.material": "Material",
  "type.quest": "Misiune",
  "type.misc": "Diverse",

  // items
  "item.sword": "Sabie",
  "item.wooden_shield": "Scut de lemn",
  "item.straw_hat": "Pălărie de paie",
  "item.linen_shirt": "Cămașă de in",
  "item.leather_vest": "Vestă de piele",
  "item.work_trousers": "Pantaloni de lucru",
  "item.old_boots": "Cizme vechi",
  "item.belt": "Curea",
  "item.adventurers_belt": "Centura aventurierului",
  "item.gold_earring": "Cercel de aur",
  "item.silver_earring": "Cercel de argint",
  "item.carrot": "Morcov",
  "item.health_potion": "Poțiune de viață",
  "item.house_key": "Cheia casei",
  "item.unknown": "Obiect necunoscut",

  // outfit / hotbar slots
  "slot.earring": "Cercel {n}",
  "slot.earringShort": "C{n}",
  "slot.head": "Pălărie / Coif",
  "slot.headShort": "Cap",
  "slot.shirt": "Cămașă",
  "slot.shirtShort": "Căm.",
  "slot.armor": "Armură de corp",
  "slot.armorShort": "Arm.",
  "slot.hand": "Mâna {n}",
  "slot.handShort": "M{n}",
  "slot.belt": "Curea",
  "slot.beltShort": "Curea",
  "slot.trousers": "Pantaloni",
  "slot.trousersShort": "Pant.",
  "slot.boots": "Cizme",
  "slot.bootsShort": "Cizme",
  "slot.pocket": "Buzunarul {n} de la curea",
  "slot.empty": "gol",
  "slot.hint": "{slot}: {item}\nTrage obiecte aici · trage în afară pentru a muta/schimba · Shift+clic sau clic dreapta pentru a scoate",

  // stats window and vitals
  "stats.hp": "Viață",
  "stats.fatigue": "Oboseală",
  "stats.attack": "Atac",
  "stats.defense": "Apărare",
  "stats.armor": "Armură",
  "stats.speed": "Viteză",
  "stats.spellSlots": "Locuri de vrăji",
  "stats.spellSlotsHint": "Locurile din bara rapidă în care așteaptă vrăjile încărcate. Mai multă Inteligență îți dă mai multe.",
  "stats.spellTime": "Vraja durează",
  "stats.spellTimeHint": "Cât așteaptă o vrajă încărcată în locul ei până se stinge. Inteligența o face să dureze mai mult.",
  "stats.hunger": "Foame",
  "stats.hpHint": "Viața. Rezistența îți dă mai multă.",
  "stats.fatigueHint":
    "Energie pentru luptă: atacurile și parările te obosesc, iar ea revine încet. Rezistența îți dă mai multă și o ajută să revină mai repede.",
  "stats.attackHint": "Cât de tare lovești. Depinde de armă, de Forță și de Agilitate.",
  "stats.defenseHint": "Cât oprește o parare. Depinde de ce ții în mâini și de Agilitate.",
  "stats.armorHint": "Protecția din ce porți pe tine. Îndulcește fiecare lovitură.",
  "stats.speedHint": "Cât de repede te miști. Agilitatea te face mai rapid; drumurile ajută, terenul greu te încetinește.",
  "stats.hungerHint":
    "Cât de sătul ești. Cât timp nu ți-e foame, te vindeci încet (cu cât ești mai sătul, cu atât mai repede); când scade prea mult, începi să pierzi viață. Mănâncă pentru a o umple.",
  "stats.note": "Parările și armura îndulcesc loviturile pe care le primești.",
  "vitals.hpHint": "Viață",
  "vitals.fatigueHint": "Oboseală: atacurile și parările te obosesc; revine încet",
  "vitals.hungerHint": "Foame: mănâncă pentru a rămâne sănătos (clic dreapta pe mâncare în inventar sau E pentru locul selectat din bara rapidă)",

  // combat effects
  "fx.words": "BUF!|PAC!|POC!",
  "fx.tooTired": "Prea obosit!",
  "fx.notHungry": "Nu mi-e foame!",
  "fx.bite": "Haț!",
  "fx.emptyHand": "Mâna 2 e goală",
  "fx.nothingHappens": "Nu se întâmplă nimic…",
  "shout.charge": "ATACAȚI!",
  "shout.aaa": "AAAAAAA!!!",
  "shout.retreat": "RETRAGEREA!",
  "shout.run": "FUGIȚI CÂT PUTEȚI!",
  "shout.victory": "Victoria e a noastră!",
  "shout.fineDay": "A fost o zi frumoasă!",
  "shout.lostMen": "Am pierdut mulți oameni, dar am ucis monstrul.",
  "shout.triumph": "Am triumfat din nou!",
  "enemy.king": "Regele Arthur",
  "fx.protected": "Încă nu!",
  "life.knockedOut": "Knockout! Te ridici în {n}…",
  "life.protected": "Protejat încă {n} s, dar nu poți ataca încă",

  // magic
  "spell.fireball": "Minge de foc",
  "spell.fireball.desc": "Explodează pe o pătrățică și pe cele 8 din jurul ei. Inteligența o face mai puternică; armura o îndulcește.",
  "rune.ka": "Ka",
  "rune.ka.meaning": "a crea",
  "rune.ash": "Ash",
  "rune.ash.meaning": "foc",
  "rune.dom": "Dom",
  "rune.dom.meaning": "explozie",
  "spell.healing": "Vindecare",
  "spell.healing.desc": "Vindecă fiecare iepuraș aflat pe o pătrățică, inclusiv pe tine. Inteligența o face să vindece mai mult.",
  "rune.ul": "Ul",
  "rune.ul.meaning": "viață",
  "rune.tor": "Tor",
  "rune.tor.meaning": "a da",
  "rune.sel": "Sel",
  "rune.sel.meaning": "a repara",
  "spell.necromancy": "Necromanție",
  "spell.necromancy.desc": "Cel mai apropiat cadavru de tine (până la 2 pătrățele) se ridică drept zombi și te slujește 10 minute. Nu se țintește: apasă tasta ei lângă un cadavru.",
  "rune.mor": "Mor",
  "rune.mor.meaning": "moarte",
  "magic.scrollHint": "Desenează runele de sus în jos · eliberează F pentru a vrăji · clic dreapta șterge pergamentul",
  "magic.reading": "Se citesc runele…",
  "magic.unknown": "?",
  "magic.charged": "{spell}! Apasă {key} pentru a o folosi",
  "magic.fail.empty": "Pergamentul e gol",
  "magic.fail.unreadable": "Runele sunt prea mâzgălite ca să poată fi citite",
  "magic.fail.unknownRune": "Nu cunoști runa aceea",
  "magic.fail.noSpell": "Runele acestea nu formează nicio vrajă",
  "magic.fail.busy": "Nu acum!",
  "magic.aimHint": "{spell}: clic pe o pătrățică pentru a o arunca acolo · clic dreapta sau Esc pentru anulare",
  "magic.tooFar": "Prea departe!",
  "magic.noBody": "Niciun cadavru destul de aproape!",
  "army.none": "Nu ai niciun strigoi pe care să-l comanzi",
  "army.aimHint": "Armata de strigoi: clic pe o pătrățică pentru a-i trimite acolo · apropie-te de ei ca să-i chemi înapoi · clic dreapta sau Esc pentru anulare",
  "army.button": "Armata ta de strigoi: {n} [N]\nApasă N sau dă clic, apoi clic pe o pătrățică: atacă pe oricine e pe ea sau în jurul ei.\nApropie-te de ei ca să te urmeze din nou.",
  "slot.spell": "{spell} [{key}]: se stinge în {n} s\nApasă {key} sau dă clic pentru a ținti",
  "spellbook.pick": "Alege o vrajă ca să vezi cum se face",
  "spellbook.howTo": "Desenează pe pergament, de sus în jos:",
  "spellbook.hint": "Ține apăsat F și desenează runele unei vrăji pe pergament de sus în jos, apoi eliberează F.",
  "spellbook.none": "Încă nu cunoști nicio rună.",
  "spellbook.missing": "Încă nu-i cunoști toate runele",
  "fx.boom": "BUBUIALĂ!",

  "chat.placeholder": "Spune ceva… (Enter: trimite · Esc: anulează)",

  // options
  "options.button": "Opțiuni",
  "options.title": "Opțiuni",
  "options.copyInvite": "Copiază linkul de invitație",
  "options.copied": "Copiat!",
  "options.inviteHint": "Trimite linkul acesta prietenilor ca să intre în jocul tău.",
  "options.language": "Limba",
  "options.exit": "Ieșire în meniul principal",
  "options.close": "Închide",
  "options.blood": "Sânge",
  "options.bloodHint": "Cât de grafice arată loviturile: de la deloc sânge până la stropeală maximă. Schimbă doar ce vezi tu.",
  "blood.off": "Oprit",
  "blood.low": "Puțin sânge",
  "blood.medium": "Mediu",
  "blood.high": "Mult",
  "blood.max": "Sânge la maximum",

  // help
  "help.button": "Ajutor (H)",
  "help.title": "Ajutor",
  "help.controls.title": "Comenzi",
  "help.controls.body": `## Deplasare
Mergi cu [W] [A] [S] [D] sau cu săgețile. Drumurile te fac mai rapid. Pădurile, dealurile, râurile, mlaștinile și piscurile înzăpezite te încetinesc, iar marea nu o poate traversa nimeni înot. Nu poți trece prin alți iepurași sau animale: fiecare păstrează o distanță de aproximativ o jumătate de pătrățică.

## Ferestre
- [M] hartă, [I] inventar, [O] echipament, [K] atribute, [P] carte de vrăji: apasă tasta sau dă clic pe bara de titlu ca să strângi fereastra și încă o dată ca să o deschizi.
- Trage de bara de titlu ca să muți fereastra. Clic dreapta pe bara de titlu o readuce la locul ei obișnuit.
- [Esc] deschide opțiunile, [H] deschide acest ajutor.

## Inventar
- Scrie în caseta de filtru ca să cauți după nume sau dă clic pe o pictogramă de tip ca să vezi doar acel fel de obiecte. Clic pe **Nume** sau **Tip** sortează lista.
- Clic pe un obiect îl selectează; devine auriu.
- [Shift]+[E] îmbracă obiectul selectat în locul potrivit din echipament.
- [Shift]+[1], [Shift]+[2]… pune obiectul selectat în acel loc din bara rapidă. Dublu clic îl pune în locul selectat din bara rapidă.
- Trage un obiect din inventar sau din orice loc pe alt loc. Dacă locul e ocupat, cele două obiecte se schimbă între ele. În timp ce tragi, un loc se luminează verde dacă obiectul încape acolo și roșu dacă nu.
- [Shift]+clic sau clic dreapta pe un loc scoate obiectul din el.

## Bara rapidă
- Locurile 1 și 2 din bara rapidă sunt cele două mâini ale tale. O curea îți dă buzunare în plus (locurile cu margine punctată).
- **Clic dreapta** pe hartă folosește ce ai în mâna 2, spre cursor: o armă atacă, un scut parează, mâncarea se mănâncă.
- Apasă [1], [2]… sau dă clic pe un loc ca să-l selectezi. [E] folosește obiectul selectat, de exemplu mănâncă un morcov.
- Poți mânca și dând clic dreapta pe mâncare în inventar.

## Foame
Bara verde a foamei se golește încet. Un iepuraș bine hrănit se vindecă în timp; unul flămând pierde viață. Mănâncă atunci când scade, dar nu poți mânca dacă ești deja sătul.

## Magie
Ține apăsat [F] ca să deschizi pergamentul magic și să desenezi rune pe el; vrăjile încărcate apar în locurile [X] [C] [V] [B]. Vezi secțiunea **Magie**. Apasă [N] ca să-ți trimiți armata de strigoi (ridicată cu Necromanție) pe o pătrățică.

## Chat
Apasă [T], scrie mesajul și apasă [Enter]. Apare într-un balon deasupra iepurașului tău, ca să-l vadă toată lumea. [Esc] anulează.`,
  "help.combat.title": "Luptă",
  "help.combat.body": `## Atac
**Clic** pe hartă atacă în acea direcție. **Clic dreapta** folosește în schimb a doua mână: cu un scut acolo parezi, cu o a doua armă ataci. Atacul ajunge cam la o pătrățică și îi lovește pe iepurașii din fața ta. Poți lovi doar de câteva ori pe secundă, așa că țintește bine.

## Parare
Ține apăsat [Shift] și dă **clic** ca să-ți ridici garda spre acea parte pentru o clipă. O parare oprește doar atacurile care vin din partea pe care o aperi. Dă clic din nou ca să-ți ții garda sus.

## Daune
- Loviturile îți iau din viață. Nu se afișează numere: urmărește bara de viață și ghicește.
- Ce ai în mâini hotărăște atacul și apărarea: contează cel mai bun atac și cea mai bună apărare dintre cele două mâini, așa că o sabie și un scut merg bine împreună. Cu labele goale lovești foarte slab.
- O parare absoarbe o parte din lovitură. Armura pe care o porți (vestă, cizme…) îndulcește fiecare lovitură, parată sau nu.
- La 0 viață ești knockout: iepurașul tău zace acolo cu ochii x.x timp de 10 secunde, apoi se trezește în orașul de start cu viața plină. În următoarele 10 secunde nimeni nu te poate răni (clipești), dar nici tu nu poți ataca.

## Oboseală
Atacurile și parările te obosesc, iar oprirea unei lovituri cu o parare costă puțin în plus. Oboseala revine încet de la sine. Când ești prea obosit nu poți ataca sau para, iar un apărător obosit nu poate opri o lovitură.

## Noroc
Uneori norocul îți zâmbește. Un atac norocos lovește mai tare (explozie mai mare) sau chiar dublu (o insignă „2x”). O parare norocoasă oprește lovitura complet (scut mai mare), iar cele mai norocoase parări îl și epuizează pe atacator. Mai multe lucruri norocoase se pot întâmpla deodată.

## Șobolani
Șobolanii cutreieră sălbăticia în căutare de mâncare. Dacă ajungi la câțiva pași de ei, fug spre tine și te mușcă („Haț!”). Sunt slabi: câteva lovituri de sabie termină unul, o parare le oprește mușcăturile și sunt mai lenți decât tine, așa că poți fugi oricând. Nu intră în orașe. Un șobolan mort este curând înlocuit de altul, în altă parte.

## Atributele tale în luptă
- **Forța** îți face atacurile mai puternice.
- **Agilitatea** îți face parările mai solide și îți ajută puțin atacurile.
- **Rezistența** îți dă mai multă viață și mai multă energie și te ajută să-ți revii mai repede.
- **Norocul** face ca loviturile și parările norocoase să apară mai des.`,
  "help.stats.title": "Atribute",
  "help.stats.body": `Când îți creezi iepurașul, împarți 20 de puncte între șase atribute, fiecare între 1 și 10. Nu există o combinație perfectă: un luptător puternic, un alergător rapid, un supraviețuitor dur sau un ștrengar norocos se pot descurca la fel de bine. Îți poți vedea atributele oricând în fereastra Atribute ([K]).

## Forță
Putere brută. Forța este sursa principală a atacului tău: cu cât e mai mare, cu atât doare mai tare fiecare lovitură cu arma. Nu te ajută să parezi sau să fugi. Alege-o dacă vrei să închei luptele repede.

## Agilitate
Iuțeală și echilibru. Agilitatea ajută în trei feluri: te miști mai repede peste tot pe hartă, parările devin mai solide, iar atacurile puțin mai puternice. Este cel mai complet atribut, bun pentru luptă și pentru explorarea insulei mari.

## Inteligență
Isteime și sursa magiei. Inteligența îți face vrăjile mai puternice (cu cât e mai mare, cu atât doare mai tare o minge de foc), îți dă mai multe locuri de vrăji în bara rapidă (1 loc la început, 2 de la Inteligență 3, 3 de la 6, toate 4 de la 8) și le lasă pe cele încărcate să aștepte mai mult până se sting. Alege-o dacă vrei să lupți de la distanță.

## Farmec
Spirit și înfățișare. Deocamdată nu face nimic; va conta și el mai târziu.

## Rezistență
Duritate. Rezistența îți dă mai multă viață și mai multă energie și face ca oboseala să-ți treacă mai repede. Un iepuraș cu Rezistență mare supraviețuiește luptelor lungi și poate lovi și para în continuare când alții au rămas fără suflu.

## Noroc
Șansă. Norocul face ca momentele norocoase din luptă să apară mai des: lovituri mai tari sau duble când ataci și parări complete sau chiar perfecte când te aperi. Cu puțin Noroc sunt rare; cu mult, apar vizibil mai des.

## Bare și valori
- **Viață**: sănătatea ta. La 0 te întorci în orașul de start. Rezistența o crește.
- **Oboseală**: energia ta pentru luptă. Rezistența o crește și îi grăbește revenirea.
- **Foame**: cât de sătul ești. Rămâi bine hrănit ca să te vindeci în timp.
- **Atac** și **Apărare**: vin din ce ții în mâini, întărite de atributele tale.
- **Armură**: vine din tot ce porți pe tine; îndulcește fiecare lovitură.
- **Viteză**: cât de repede te miști. Agilitatea ajută; drumurile te grăbesc, iar terenul greu te încetinește.`,
  "help.magic.title": "Magie",
  "help.magic.body": `## Pergamentul magic
Ține apăsat [F] și în fața ta se deschide un pergament magic mare. Doar tu îl vezi: ceilalți văd doar că ochii iepurașului tău strălucesc roșu și scânteiază (și vor ști că urmează ceva). Cât timp pergamentul e deschis, stai pe loc.

## Desenarea runelor
- Desenează runele unei vrăji cu mouse-ul, **de sus în jos**, în ordinea corectă. Nu contează unde le desenezi de la stânga la dreapta.
- Lasă puțin spațiu între două rune, ca să nu se atingă de sus în jos; o rună poate fi făcută din mai multe linii.
- Runele nu trebuie să fie perfecte, doar recognoscibile. Mari sau mici, puțin strâmbe: merge oricum.
- **Clic dreapta** șterge pergamentul dacă vrei să o iei de la capăt.
- Eliberează [F] ca să citești pergamentul. Pentru o clipă arată ce rună a văzut și unde (un „?” înseamnă că nu a putut-o citi).
- Poți folosi doar runele pe care le cunoști. În **Cartea de vrăji** ([P]) alege o vrajă din listă ca să-i vezi runele în ordine. Runele pe care le cunoști sunt în partea de jos a acestei pagini.

## Locuri de vrăji
O vrajă reușită intră într-un loc de vrăji liber din bara rapidă: [X], apoi [C], [V] și [B]. Câte astfel de locuri ai depinde de **Inteligență**: 1 la început, 2 de la Inteligență 3, 3 de la 6 și toate 4 de la 8. O vrajă așteaptă în locul ei **1 minut plus 6 secunde pentru fiecare punct de Inteligență**, apoi se stinge. Apasă tasta locului (sau dă clic pe el) ca să o folosești; fiecare încărcătură merge o singură dată. Dacă toate locurile sunt pline, o vrajă nouă o înlocuiește pe cea care s-ar stinge prima. Dacă ești knockout, pierzi pergamentul și toate vrăjile încărcate.

## Minge de foc
Rune: **Ka** (a crea), **Ash** (foc), **Dom** (explozie). Apasă tasta ei și pe pământ apare o țintă: mut-o cu mouse-ul și dă **clic** ca să arunci. Mingea de foc zboară acolo și explodează pe acea pătrățică și pe cele 8 din jurul ei, rănind pe toată lumea și tot ce se află acolo, **inclusiv pe tine** dacă ești atât de aproape (când focul prietenesc e pornit), așa că păstrează distanța. Ajunge cam la 8 pătrățele; ținta se face roșie când e prea departe. **Clic dreapta** sau [Esc] anulează.
- Daunele ei cresc odată cu **Inteligența**. Armura o îndulcește, dar nu poate fi parată cu un scut.
- Cu focul prietenesc oprit, nu rănește niciun iepuraș, nici pe tine.

## Vindecare
Rune: **Ul** (viață, două linii paralele înclinate ca \\), **Tor** (a da, un T) și **Sel** (a repara, un / lung cu un \\ scurt lipit de jumătatea lui de jos). Se țintește ca mingea de foc, dar ținta este o singură pătrățică: dă clic ca să o arunci pe acea pătrățică. Fiecare iepuraș aflat acolo primește viață înapoi, inclusiv tu, așa că țintește propria pătrățică ca să te vindeci.
- Cu cât ai mai multă **Inteligență**, cu atât vindecă mai mult. Nu vindecă niciodată peste viața plină a unui iepuraș.
- Merge la fel pe prieteni și pe dușmani (dar nu pe animale) și o poți folosi chiar și cât timp ești încă protejat după trezire.

## Necromanție
Rune: **Mor** (moarte, un stâlp cu o ramură care urcă spre dreapta), **Ul** (viață) și **Ka** (a crea). Nu se țintește: stai lângă un șobolan sau un cruciat căzut (cei uciși rămân pe pământ un minut) și apasă tasta ei. Cel mai apropiat cadavru aflat la cel mult 2 pătrățele se ridică drept zombi care te slujește **10 minute**, apoi se preface în praf. Dacă nu e niciun cadavru destul de aproape, vraja rămâne în locul ei.
- Zombii tăi te urmează peste tot. Când tu sau unul dintre ei ești atacat, se năpustesc asupra atacatorului.
- Apasă [N] (sau dă clic pe butonul 🧟 de lângă locurile de vrăji) și clic pe o pătrățică: toată armata mărșăluiește acolo și atacă pe oricine se află pe acea pătrățică sau pe cele 8 din jurul ei. Țin locul până când te apropii de ei; atunci te urmează din nou.
- Un zombi luptă la fel de bine ca atunci când era viu. Și șobolanii, și cruciații luptă cu zombii, iar un zombi căzut poate fi ridicat din nou.
- Cu focul prietenesc oprit, zombii nu rănesc niciodată iepurașii sau zombii altor iepurași. Iepurașii trec prin zombi, așa că armata ta nu te poate încercui. Dacă ieși din joc, zombii tăi se prefac în praf.

## Runele tale
Acestea sunt runele pe care le cunoști, cu înțelesul lor. O vrajă are nevoie de toate runele ei.

{{runes}}`,
};
