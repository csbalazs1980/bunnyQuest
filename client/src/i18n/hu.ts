// Magyar
import type { Dict } from "./en";

export const hu: Dict = {
  "lobby.namePlaceholder": "A neved",
  "lobby.create": "Új játék",
  "lobby.join": "Csatlakozás",
  "lobby.joinFailed": "Nem sikerült csatlakozni – lehet, hogy a játék megtelt vagy már véget ért. Az „Új játék” gombbal indíthatsz egy sajátot.",
  "lobby.serverDown": "A szerver nem érhető el ({url}). Fut egyáltalán?",
  "lobby.invalidCharacter": "Ez a karakter nem érvényes. Oszd ki az összes pontot (minden tulajdonság 1–10).",
  "lobby.spendFirst": "Előbb oszd ki az összes pontot (még {n} maradt)",
  "lobby.friendlyFire": "Baráti tűz",
  "lobby.friendlyFireHint": "Be: a nyuszik megsebezhetik egymást. Ki: csak az állatok sebezhetnek meg.",
  "join.ffOn": "A baráti tűz BE van kapcsolva: más nyuszik megsebezhetnek. Az első 10 másodpercben biztonságban vagy.",
  "join.ffOff": "A baráti tűz KI van kapcsolva: a nyuszik nem sebezhetik meg egymást.",
  "lobby.language": "Nyelv",

  "creation.stats": "Tulajdonságok",
  "creation.pointsLeft": "Kiosztható pont:",
  "creation.preview": "Életerő {hp} · Támadás {attack} · Védekezés {defense} (karddal) · Sebesség {speed}%",

  "stat.strength": "Erő",
  "stat.agility": "Ügyesség",
  "stat.intelligence": "Intelligencia",
  "stat.charm": "Báj",
  "stat.endurance": "Állóképesség",
  "stat.luck": "Szerencse",
  "statHelp.strength": "A támadásra hat",
  "statHelp.agility": "A támadásra, a védekezésre és a mozgási sebességre hat",
  "statHelp.intelligence": "Erősebbé teszi a varázslataidat, több varázshelyet ad, és tovább tartanak a varázslatok",
  "statHelp.charm": "Később lesz jelentősége",
  "statHelp.endurance": "Az életerőre, az erőnlétre (fáradtság) és a regenerálódás gyorsaságára hat",
  "statHelp.luck": "Gyakrabban jönnek szerencsés ütések és védések",

  "window.hint": "Kattints vagy nyomd meg a(z) {key} gombot a kicsinyítéshez · húzd az áthelyezéshez · jobb klikk: eredeti hely",
  "window.map": "Térkép",
  "window.inventory": "Tárgyak",
  "window.outfit": "Öltözet",
  "window.spellbook": "Varázskönyv",
  "window.stats": "Tulajdonságok",

  "inv.filter": "szűrés…",
  "inv.name": "Név",
  "inv.type": "Típus",
  "inv.empty": "Nincs tárgy",
  "inv.equippedIn": "Felszerelve: {slot}",
  "inv.rowHint":
    "Kattints rá, majd Shift+E a felvételhez vagy Shift+1..N egy gyorshelyre\nVagy húzd egy helyre · dupla kattintás: a kiválasztott gyorshely\nJobb klikk: használat (evés) · E: a kiválasztott gyorshely használata",

  "type.weapon": "Fegyver",
  "type.armor": "Páncél",
  "type.clothes": "Ruha",
  "type.potion": "Bájital",
  "type.food": "Étel",
  "type.material": "Nyersanyag",
  "type.quest": "Küldetés",
  "type.misc": "Egyéb",

  "item.sword": "Kard",
  "item.wooden_shield": "Fapajzs",
  "item.straw_hat": "Szalmakalap",
  "item.linen_shirt": "Vászoning",
  "item.leather_vest": "Bőrmellény",
  "item.work_trousers": "Munkanadrág",
  "item.old_boots": "Régi csizma",
  "item.belt": "Öv",
  "item.adventurers_belt": "Kalandozóöv",
  "item.gold_earring": "Aranyfülbevaló",
  "item.silver_earring": "Ezüstfülbevaló",
  "item.carrot": "Répa",
  "item.health_potion": "Gyógyital",
  "item.house_key": "Házkulcs",
  "item.unknown": "Ismeretlen tárgy",

  "slot.earring": "Fülbevaló {n}",
  "slot.earringShort": "F{n}",
  "slot.head": "Kalap / Sisak",
  "slot.headShort": "Fej",
  "slot.shirt": "Ing",
  "slot.shirtShort": "Ing",
  "slot.armor": "Felsőtest-páncél",
  "slot.armorShort": "Páncél",
  "slot.hand": "{n}. kéz",
  "slot.handShort": "K{n}",
  "slot.belt": "Öv",
  "slot.beltShort": "Öv",
  "slot.trousers": "Nadrág",
  "slot.trousersShort": "Nadr.",
  "slot.boots": "Csizma",
  "slot.bootsShort": "Csizma",
  "slot.pocket": "{n}. övzseb",
  "slot.empty": "üres",
  "slot.hint": "{slot}: {item}\nIde húzhatsz tárgyakat · húzd ki az áthelyezéshez/cseréhez · Shift+kattintás vagy jobb klikk: levétel",

  "stats.hp": "Életerő",
  "stats.fatigue": "Fáradtság",
  "stats.attack": "Támadás",
  "stats.defense": "Védekezés",
  "stats.armor": "Páncél",
  "stats.spellSlots": "Varázshelyek",
  "stats.spellSlotsHint": "A gyorssáv helyei, ahol a feltöltött varázslataid várnak. Több Intelligenciával több jár.",
  "stats.spellTime": "Varázslat ideje",
  "stats.spellTimeHint": "Meddig vár egy feltöltött varázslat a helyén, mielőtt elillan. Az Intelligencia meghosszabbítja.",
  "stats.speed": "Sebesség",
  "stats.hunger": "Éhség",
  "stats.hpHint": "Életerő. Az állóképesség növeli.",
  "stats.fatigueHint":
    "Harci erőnlét: a támadás és a védekezés fáraszt, lassan visszatér. Az állóképesség növeli és gyorsítja a visszatöltődést.",
  "stats.attackHint": "Milyen erősen ütsz. A fegyveredtől, az erődtől és az ügyességedtől függ.",
  "stats.defenseHint": "Mennyit fog fel egy védés. Attól függ, mit tartasz a kezedben, és az ügyességedtől.",
  "stats.armorHint": "Védelem a viselt holmidtól. Minden ütést tompít.",
  "stats.speedHint": "Milyen gyorsan mozogsz. Az ügyesség gyorsít; az utak segítenek, a nehéz terep lassít.",
  "stats.hungerHint":
    "Mennyire vagy jóllakott. Amíg nem vagy éhes, lassan gyógyulsz (minél jóllakottabb vagy, annál gyorsabban); ha nagyon lecsökken, életerőt veszítesz. Egyél, hogy feltöltsd.",
  "stats.note": "A védés és a páncél tompítja a kapott ütéseket.",
  "vitals.hpHint": "Életerő",
  "vitals.fatigueHint": "Fáradtság: a támadás és a védés fáraszt; lassan elmúlik",
  "vitals.hungerHint": "Éhség: egyél, hogy egészséges maradj (jobb klikk az ételre a tárgyak között, vagy E a kiválasztott gyorshelyhez)",

  "fx.words": "BUMM!|PUFF!|CSATT!",
  "fx.tooTired": "Túl fáradt!",
  "fx.notHungry": "Nem vagyok éhes!",
  "fx.bite": "Hamm!",
  "fx.emptyHand": "A 2. kezed üres",
  "fx.nothingHappens": "Nem történik semmi…",
  "shout.charge": "ROHAM!",
  "shout.aaa": "ÁÁÁÁÁÁÁ!!!",
  "shout.retreat": "VISSZAVONULÁS!",
  "shout.run": "MENTSE, AKI TUDJA, AZ IRHÁJÁT!",
  "shout.victory": "Miénk a győzelem!",
  "shout.fineDay": "Ez egy szép nap volt!",
  "shout.lostMen": "Sok emberünket elvesztettük, de megöltük a szörnyet.",
  "shout.triumph": "Ismét diadalmaskodtunk!",
  "enemy.king": "Artúr király",
  "fx.protected": "Még nem!",
  "life.knockedOut": "Kiütöttek! {n} múlva újra talpon…",
  "life.protected": "Még {n} mp-ig védett vagy, de még nem támadhatsz",

  // varázslás
  "spell.fireball": "Tűzgolyó",
  "spell.fireball.desc": "Egy mezőn és a körülötte lévő 8 mezőn robban. Az Intelligencia erősíti, a páncél tompítja.",
  "rune.ka": "Ka",
  "rune.ka.meaning": "teremtés",
  "rune.ash": "Ash",
  "rune.ash.meaning": "tűz",
  "rune.dom": "Dom",
  "rune.dom.meaning": "robbanás",
  "magic.scrollHint": "Rajzold a rúnákat fentről lefelé · engedd el az F-et a varázsláshoz · jobb klikk: tekercs törlése",
  "magic.reading": "A rúnák olvasása…",
  "magic.unknown": "?",
  "magic.charged": "{spell}! Nyomd meg: {key}",
  "magic.fail.empty": "A tekercs üres",
  "magic.fail.unreadable": "A rúnák túl maszatosak, nem olvashatók",
  "magic.fail.unknownRune": "Ezt a rúnát nem ismered",
  "magic.fail.noSpell": "Ezekből a rúnákból nem lesz varázslat",
  "magic.fail.busy": "Most nem!",
  "magic.aimHint": "{spell}: kattints egy mezőre a dobáshoz · jobb klikk vagy Esc: mégse",
  "magic.tooFar": "Túl messze!",
  "slot.spell": "{spell} [{key}]: {n} mp múlva elillan\nNyomd meg: {key}, vagy kattints a célzáshoz",
  "spellbook.spells": "Varázslatok",
  "spellbook.runes": "Ismert rúnák",
  "spellbook.hint": "Tartsd lenyomva az F-et, rajzold a tekercsre a varázslat rúnáit fentről lefelé, majd engedd el az F-et.",
  "spellbook.none": "Még egy rúnát sem ismersz.",
  "spellbook.missing": "Még nem ismered az összes rúnáját",
  "fx.boom": "BUMMM!",

  "chat.placeholder": "Mondj valamit… (Enter: küldés · Esc: mégse)",

  "options.button": "Beállítások",
  "options.title": "Beállítások",
  "options.copyInvite": "Meghívó link másolása",
  "options.copied": "Másolva!",
  "options.inviteHint": "Küldd el ezt a linket a barátaidnak, hogy csatlakozhassanak a játékodhoz.",
  "options.language": "Nyelv",
  "options.exit": "Kilépés a főmenübe",
  "options.close": "Bezárás",
  "options.blood": "Vér",
  "options.bloodHint": "Mennyire véresek a találatok: a vér nélkülitől a legtöbb fröccsenésig. Csak azt változtatja, amit te látsz.",
  "blood.off": "Kikapcsolva",
  "blood.low": "Kevés vér",
  "blood.medium": "Közepes",
  "blood.high": "Sok",
  "blood.max": "Maximális vér",

  // help
  "help.button": "Súgó (H)",
  "help.title": "Súgó",
  "help.controls.title": "Irányítás",
  "help.controls.body": `## Mozgás
A [W] [A] [S] [D] gombokkal vagy a nyilakkal sétálhatsz. Az utakon gyorsabban haladsz. Az erdő, a dombok, a folyók, a mocsarak és a havas csúcsok lelassítanak, a tengert pedig senki sem tudja átúszni. Más nyuszikon és állatokon nem tudsz átsétálni: mindenki nagyjából fél mezőnyi távolságot tart.

## Ablakok
- [M] térkép, [I] tárgyak, [O] öltözet, [K] tulajdonságok, [P] varázskönyv: nyomd meg a gombot, vagy kattints a címsorra az ablak összecsukásához, majd újra a kinyitásához.
- Húzd a címsort az ablak áthelyezéséhez. Jobb klikk a címsoron: az ablak visszakerül a szokásos helyére.
- [Esc] megnyitja a beállításokat, [H] ezt a súgót.

## Tárgyak
- Írj a szűrőmezőbe a név szerinti kereséshez, vagy kattints egy típusikonra, hogy csak azt a fajta tárgyat lásd. A **Név** vagy **Típus** fejlécre kattintva rendezheted a listát.
- Kattints egy tárgyra a kiválasztásához; aranyszínű lesz.
- [Shift]+[E] felveszi a kiválasztott tárgyat a hozzá illő öltözethelyre.
- [Shift]+[1], [Shift]+[2]… a kiválasztott tárgyat arra a gyorshelyre teszi. Dupla kattintással a kiválasztott gyorshelyre kerül.
- Húzz egy tárgyat a listából vagy bármelyik helyről egy másik helyre. Ha a hely foglalt, a két tárgy helyet cserél. Húzás közben a hely zölden világít, ha a tárgy illik oda, és pirosan, ha nem.
- [Shift]+kattintás vagy jobb klikk egy helyen: leveszed a tárgyat.

## Gyorssáv
- Az 1. és 2. gyorshely a két kezed. Egy öv további zsebeket ad (a szaggatott keretes helyek).
- **Jobb klikk** a térképen a 2. kezedben lévő tárgyat használja a mutató felé: a fegyver támad, a pajzs véd, az ételt megeszed.
- Nyomd meg az [1], [2]… gombot, vagy kattints egy helyre a kiválasztásához. Az [E] használja a kiválasztott tárgyat, például megeszel egy répát.
- Ételt jobb klikkel a tárgyak között is megehetsz.

## Éhség
A zöld éhségsáv lassan fogy. A jóllakott nyuszi idővel gyógyul, a nagyon éhes életerőt veszít. Egyél, ha lecsökken, de ha már jóllaktál, nem tudsz enni.

## Varázslás
Tartsd lenyomva az [F] gombot, és kinyílik a varázstekercsed: rúnákat rajzolhatsz rá. A feltöltött varázslatok az [X] [C] [V] [B] helyekre kerülnek. Lásd a **Varázslás** témát.

## Csevegés
Nyomd meg a [T] gombot, írd be az üzenetet, és nyomj [Enter]-t. Egy buborékban jelenik meg a nyuszid felett, mindenki láthatja. Az [Esc] megszakítja.`,
  "help.combat.title": "Harc",
  "help.combat.body": `## Támadás
**Kattints** a térképre, hogy abba az irányba támadj. A **jobb klikk** a második kezedet használja: ha pajzs van benne, védekezik, ha egy második fegyver, támad. A támadás nagyjából egy mezőnyire ér el, és az előtted álló nyuszikat találja el. Másodpercenként csak néhányszor tudsz ütni, úgyhogy célozz jól.

## Védekezés
Tartsd lenyomva a [Shift]-et és **kattints**, hogy egy pillanatra védekezz abba az irányba. A védés csak abból az irányból jövő támadásokat fogja fel, amerre védekezel. Kattints újra, hogy tovább tartsd.

## Sebzés
- Az ütések életerőt visznek el. Számok nem jelennek meg: figyeld az életerő-sávot, és találgass.
- A kezedben lévő tárgyak döntik el a támadásodat és a védekezésedet: a két kezed legjobb támadása és legjobb védekezése számít, így a kard és a pajzs jól kiegészíti egymást. Puszta mancsokkal nagyon gyengén ütsz.
- A védés felfogja az ütés egy részét. A viselt páncél (mellény, csizma…) minden ütést tompít, akár védekezel, akár nem.
- Ha az életerőd elfogy, kiütnek: a nyuszid x.x szemekkel fekszik 10 másodpercig, aztán teljes életerővel felébred a kezdő városban. A következő 10 másodpercben senki sem sebezhet meg (villogsz), de te sem támadhatsz.

## Fáradtság
A támadás és a védekezés fáraszt, és ha egy ütést védéssel fogsz fel, az még egy kicsit többe kerül. A fáradtság magától, lassan elmúlik. Ha túl fáradt vagy, nem tudsz támadni és védekezni, és a fáradt védekező nem tudja felfogni az ütést.

## Szerencse
Néha rád mosolyog a szerencse. Egy szerencsés támadás nagyobbat üt (nagyobb felirat), vagy akár duplát („2x” jelzés). Egy szerencsés védés teljesen felfogja az ütést (nagyobb pajzs), a legszerencsésebb védések pedig a támadót is kifárasztják. Egyszerre több szerencsés dolog is történhet.

## Patkányok
A patkányok élelem után kutatva kóborolnak a vadonban. Ha néhány lépésnyire megközelíted őket, rád rontanak és megharapnak („Hamm!”). Gyengék: pár kardcsapás végez velük, a védés megállítja a harapást, és lassabbak nálad, úgyhogy mindig elfuthatsz. A városokba nem mennek be. Egy elpusztult patkány helyett hamarosan máshol bukkan fel egy új.

## A tulajdonságaid a harcban
- Az **Erő** erősebbé teszi a támadásaidat.
- Az **Ügyesség** szilárdabbá teszi a védésedet, és egy kicsit a támadásodat is segíti.
- Az **Állóképesség** több életerőt és fáradtságot ad, és gyorsabban regenerálódsz.
- A **Szerencse** gyakoribbá teszi a szerencsés ütéseket és védéseket.`,
  "help.stats.title": "Tulajdonságok",
  "help.stats.body": `Amikor megalkotod a nyuszidat, 20 pontot osztasz szét hat tulajdonság között, mindegyik 1 és 10 között lehet. Nincs tökéletes összeállítás: egy erős harcos, egy gyors futó, egy szívós túlélő vagy egy szerencsés kópé is jól boldogulhat. A tulajdonságaidat bármikor megnézheted a Tulajdonságok ablakban ([K]).

## Erő
Nyers erő. Az Erő a támadásod fő forrása: minél nagyobb, annál jobban fáj minden ütés a fegyvereddel. A védekezésben és a futásban nem segít. Válaszd, ha gyorsan le akarod zárni a harcokat.

## Ügyesség
Fürgeség és egyensúly. Az Ügyesség háromféleképpen segít: gyorsabban mozogsz az egész térképen, szilárdabb a védésed, és a támadásod is kicsit erősebb lesz. Ez a legsokoldalúbb tulajdonság, jó a harchoz és a nagy sziget felfedezéséhez is.

## Intelligencia
Észjárás, és a varázslás forrása. Az Intelligencia erősebbé teszi a varázslataidat (minél magasabb, annál jobban fáj egy tűzgolyó), több varázshelyet ad a gyorssávon (eleinte 1, Intelligencia 3-tól 2, 6-tól 3, 8-tól mind a 4), és a feltöltött varázslatok tovább várnak, mielőtt elillannak. Válaszd, ha messziről szeretnél harcolni.

## Báj
Szellem és jó megjelenés. Ez sem csinál még semmit; ennek is később lesz szerepe.

## Állóképesség
Szívósság. Az Állóképesség több életerőt és több fáradtságot ad, és gyorsabban tér vissza a fáradtságod. Egy nagy állóképességű nyuszi kibírja a hosszú harcokat, és akkor is ütni és védekezni tud, amikor a többiek már kifulladtak.

## Szerencse
Szerencse. Gyakoribbá teszi a szerencsés pillanatokat a harcban: nagyobb vagy dupla ütéseket támadáskor, és teljes vagy akár tökéletes védéseket védekezéskor. Kevés szerencsével ritkák, sok szerencsével érezhetően gyakran előfordulnak.

## Sávok és értékek
- **Életerő**: ha elfogy, visszakerülsz a kezdő városba. Az Állóképesség növeli.
- **Fáradtság**: a harci erőnléted. Az Állóképesség növeli, és gyorsítja a visszatöltődését.
- **Éhség**: mennyire vagy jóllakott. Maradj jóllakott, hogy idővel gyógyulj.
- **Támadás** és **Védekezés**: attól függ, mit tartasz a kezedben, és a tulajdonságaid erősítik.
- **Páncél**: mindabból jön, amit viselsz; minden ütést tompít.
- **Sebesség**: milyen gyorsan mozogsz. Az Ügyesség segít; az utak gyorsítanak, a nehéz terep lassít.`,
  "help.magic.title": "Varázslás",
  "help.magic.body": `## A varázstekercs
Tartsd lenyomva az [F] gombot, és egy nagy varázstekercs nyílik ki előtted. Csak te látod: a többiek csak annyit látnak, hogy a nyuszid szeme vörösen izzik és szikrázik (és sejthetik, hogy valami készül). Amíg a tekercs nyitva van, egy helyben állsz.

## Rúnák rajzolása
- Rajzold meg egy varázslat rúnáit az egérrel, **fentről lefelé**, a helyes sorrendben. Az, hogy jobbra vagy balra rajzolod őket, nem számít.
- Hagyj egy kis helyet két rúna között, hogy fentről lefelé ne érjenek össze; egy rúna több vonalból is állhat.
- A rúnáknak nem kell tökéletesnek lenniük, csak felismerhetőnek. Nagy vagy kicsi, kicsit ferde: mind jó.
- A **jobb klikk** letörli a tekercset, ha újra akarod kezdeni.
- Engedd el az [F] gombot, és a tekercs felolvasódik. Egy pillanatig mutatja, melyik rúnát hol ismerte fel (a "?" azt jelenti, hogy azt nem tudta elolvasni).
- Csak olyan rúnát használhatsz, amit ismersz. A **Varázskönyv** ([P]) megmutatja a rúnáidat és a belőlük készíthető varázslatokat.

## Varázshelyek
A sikerült varázslat egy szabad varázshelyre kerül a gyorssávon: [X], aztán [C], [V] és [B]. Hogy hány ilyen helyed van, az **Intelligenciádtól** függ: eleinte 1, Intelligencia 3-tól 2, 6-tól 3, 8-tól mind a 4. Egy varázslat **1 percig, plusz Intelligencia-pontonként 6 másodpercig** vár a helyén, aztán elillan. Nyomd meg a hely gombját (vagy kattints rá) a használatához; minden töltés egyszer működik. Ha minden helyed tele van, az új varázslat azt váltja le, amelyik a leghamarabb illanna el. Ha kiütnek, elejted a tekercset, és minden feltöltött varázslatod elillan.

## Tűzgolyó
Rúnák: **Ka** (teremtés), **Ash** (tűz), **Dom** (robbanás). Nyomd meg a gombját, és egy célkereszt jelenik meg a földön: mozgasd az egérrel, és **kattints** a dobáshoz. A tűzgolyó odarepül, és azon a mezőn meg a körülötte lévő 8 mezőn robban, mindenkit és mindent megsebezve, aki ott áll (kivéve téged). Körülbelül 8 mezőnyire ér el; ha túl messze célzol, a cél pirosra vált. A **jobb klikk** vagy az [Esc] visszavonja.
- A sebzése az **Intelligenciáddal** nő. A páncél tompítja, de pajzzsal nem lehet kivédeni.
- Ha a baráti tűz ki van kapcsolva, más nyuszikat nem sebez meg.`,
};
