import csv
import os
import random
import sys
import pygame


# ============================================================
# FILE USATI DAL GIOCO
# ============================================================

FILE_RETICOLO = "reticolo_stradale.csv"
FILE_PERCORSO = "percorso.csv"
FILE_INCROCI = "incroci.csv"
FILE_DOMANDE = "domande.csv"
#FILE_TABELLONE = "tabellone_A2_300dpi_senza_margini2.png"
FILE_TABELLONE = "tabellone.png"
CARTELLA_IMMAGINI = "immagini"


# ============================================================
# COLORI
# ============================================================

BIANCO = (255, 255, 255)
NERO = (0, 0, 0)
BLU = (60, 120, 220)
VERDE = (60, 180, 90)
ROSSO = (220, 80, 80)
GIALLO = (240, 210, 70)


# ============================================================
# LETTURA DEI FILE CSV
# ============================================================

reticolo = []

with open(FILE_RETICOLO, "r", encoding="utf-8-sig", newline="") as file:
    lettore = csv.reader(file, delimiter=",")

    for riga in lettore:
        reticolo.append(riga)


percorso = []



with open(FILE_PERCORSO, "r", encoding="cp1252", newline="") as file:
    lettore = csv.DictReader(file, delimiter=";")

    for riga in lettore:
        x = int(riga["x"])
        y = int(riga["y"])
        percorso.append((x, y))


incroci = []

with open(FILE_INCROCI, "r", encoding="cp1252", newline="") as file:
    lettore = csv.DictReader(file, delimiter=";")

    for riga in lettore:
        x = int(riga["x"])
        y = int(riga["y"])
        incroci.append((x, y))


domande = []

with open(FILE_DOMANDE, "r", encoding="cp1252", newline="") as file:
    lettore = csv.DictReader(file, delimiter=";")

    for riga in lettore:
        risposta = riga["risposta"].strip().upper() == "VERO"

        domanda = {
            "testo": riga["domanda"],
            "risposta": risposta,
            "immagine": riga["immagine"],
        }

        domande.append(domanda)


            
# ============================================================
# PREPARAZIONE DEI DATI DEL GIOCO
# ============================================================

altezza_griglia = len(reticolo)
larghezza_griglia = len(reticolo[0])

incroci_set = set(incroci)
tappe = []

for cella in percorso:
    if cella in incroci_set:
        tappe.append(cella)

arrivo = tappe[-1]
print(f"tappe = {tappe}")

# ============================================================
# PREPARAZIONE DI PYGAME
# ============================================================

pygame.init()

MARGINE = 40
LARGHEZZA_PANNELLO = 360
LARGHEZZA_TABELLONE = 1300

# Carica e ridimensiona il tabellone.
tabellone = pygame.image.load(FILE_TABELLONE)
larghezza_originale, altezza_originale = tabellone.get_size()

scala = LARGHEZZA_TABELLONE / larghezza_originale
altezza_tabellone = int(altezza_originale * scala)

tabellone = pygame.transform.smoothscale(
    tabellone,
    (LARGHEZZA_TABELLONE, altezza_tabellone)
)


larghezza_tabellone, altezza_tabellone = tabellone.get_size()

# Calcola la dimensione di una cella della griglia.
larghezza_cella = larghezza_tabellone / larghezza_griglia
altezza_cella = altezza_tabellone / altezza_griglia

# Crea la finestra.
larghezza_finestra = larghezza_tabellone + MARGINE * 2 + LARGHEZZA_PANNELLO
altezza_finestra = altezza_tabellone + MARGINE * 2

schermo = pygame.display.set_mode((larghezza_finestra, altezza_finestra))
pygame.display.set_caption("Gioco della patente")

tabellone = tabellone.convert()
font = pygame.font.SysFont(None, 28)
font_piccolo = pygame.font.SysFont(None, 22)

pannello_x = MARGINE + larghezza_tabellone + MARGINE

bottone_vero = pygame.Rect(pannello_x + 40, 650, 120, 50)
bottone_falso = pygame.Rect(pannello_x + 190, 650, 120, 50)


# ============================================================
# VARIABILI DEL GIOCO
# ============================================================

vite = 3
numero_tappa = 0
posizione = tappe[numero_tappa]
domanda_attuale = random.choice(domande)
messaggio = "Rispondi alla domanda."

gioco_finito = False

orologio = pygame.time.Clock()


# ============================================================
# CICLO PRINCIPALE
# ============================================================

while True:

    # --------------------------------------------------------
    # 1. GESTIONE DEGLI EVENTI
    # --------------------------------------------------------

    for evento in pygame.event.get():

        if evento.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

        if evento.type == pygame.MOUSEBUTTONDOWN and not gioco_finito:

            risposta_data = None

            if bottone_vero.collidepoint(evento.pos):
                risposta_data = True

            if bottone_falso.collidepoint(evento.pos):
                risposta_data = False

            if risposta_data is not None:

                risposta_corretta = domanda_attuale["risposta"]

                if risposta_data == risposta_corretta:
                    numero_tappa += 1

                    if numero_tappa == len(tappe):
                        posizione = arrivo
                        messaggio = "Hai vinto!"
                        gioco_finito = True
                    else:
                        posizione = tappe[numero_tappa]
                        messaggio = "Risposta corretta!"
                        domanda_attuale = random.choice(domande)

                else:
                    vite -= 1
                    numero_tappa -= 1
                    posizione = tappe[numero_tappa]

                    if vite == 0:
                        messaggio = "Game over!"
                        gioco_finito = True
                    else:
                        messaggio = "Risposta sbagliata! Torni indietro."
                        domanda_attuale = random.choice(domande)


    # --------------------------------------------------------
    # 2. DISEGNO DEL TABELLONE
    # --------------------------------------------------------

    schermo.fill(BIANCO)
    schermo.blit(tabellone, (MARGINE, MARGINE))

    punti_percorso = []

    for cella in percorso:
        x, y = cella

        schermo_x = MARGINE + (x) * larghezza_cella
        schermo_y = MARGINE + (altezza_griglia - y - 1) * altezza_cella

        centro_x = int(schermo_x + larghezza_cella / 2)
        centro_y = int(schermo_y + altezza_cella / 2)

        punti_percorso.append((centro_x, centro_y))

    pygame.draw.lines(schermo, GIALLO, False, punti_percorso, 8)
    pygame.draw.lines(schermo, BLU, False, punti_percorso, 4)

    for punto in punti_percorso:
        pygame.draw.circle(schermo, BLU, punto, 4)

    # Disegna la posizione attuale del giocatore.
    x, y = posizione
    schermo_x = MARGINE + (x) * larghezza_cella
    schermo_y = MARGINE + (altezza_griglia - y - 1) * altezza_cella
    centro_x = int(schermo_x + larghezza_cella / 2)
    centro_y = int(schermo_y + altezza_cella / 2)

    pygame.draw.circle(schermo, GIALLO, (centro_x, centro_y), 14)


    # --------------------------------------------------------
    # 3. DISEGNO DEL PANNELLO A DESTRA
    # --------------------------------------------------------

    titolo = font.render("Quiz patente", True, NERO)
    schermo.blit(titolo, (pannello_x + 40, 50))

    testo_vite = font.render(f"Vite: {vite}", True, NERO)
    schermo.blit(testo_vite, (pannello_x + 40, 100))

    testo_posizione = font_piccolo.render(f"Posizione: {posizione}", True, NERO)
    schermo.blit(testo_posizione, (pannello_x + 40, 135))


    # --------------------------------------------------------
    # 4. IMMAGINE DELLA DOMANDA
    # --------------------------------------------------------

    y_domanda = 160
    nome_immagine = domanda_attuale["immagine"]

    if nome_immagine != "":
        percorso_immagine = os.path.join(CARTELLA_IMMAGINI, nome_immagine)

        if os.path.exists(percorso_immagine):
            immagine = pygame.image.load(percorso_immagine).convert_alpha()

            larghezza_massima = 280
            altezza_massima = 170

            larghezza, altezza = immagine.get_size()
            scala = min(larghezza_massima / larghezza, altezza_massima / altezza)

            nuova_larghezza = int(larghezza * scala)
            nuova_altezza = int(altezza * scala)

            immagine = pygame.transform.smoothscale(
                immagine,
                (nuova_larghezza, nuova_altezza)
            )

            x_immagine = pannello_x + 40 + (larghezza_massima - nuova_larghezza) // 2
            schermo.blit(immagine, (x_immagine, y_domanda))

            y_domanda = y_domanda + nuova_altezza + 20
        else:
            print("Immagine non trovata:", percorso_immagine)


    # --------------------------------------------------------
    # 5. TESTO DELLA DOMANDA
    # --------------------------------------------------------

    parole = domanda_attuale["testo"].split()
    riga = ""
    x_testo = pannello_x + 40
    larghezza_massima = 280
        # ------
        # divide il testo della domanda in stringhe di lunghezza inferiore a larghezza_massima (280)
        # -----
    for parola in parole:
        prova = riga + parola + " "
        immagine_testo = font.render(prova, True, NERO)

        if immagine_testo.get_width() > larghezza_massima:
            schermo.blit(font.render(riga, True, NERO), (x_testo, y_domanda))
            y_domanda += 26
            riga = parola + " "
        else:
            riga = prova

    if riga != "":
        schermo.blit(font.render(riga, True, NERO), (x_testo, y_domanda))


    # --------------------------------------------------------
    # 6. BOTTONI VERO / FALSO
    # --------------------------------------------------------

    pygame.draw.rect(schermo, VERDE, bottone_vero)
    pygame.draw.rect(schermo, NERO, bottone_vero, 2)
    schermo.blit(font.render("VERO", True, NERO), (bottone_vero.x + 32, bottone_vero.y + 12))

    pygame.draw.rect(schermo, ROSSO, bottone_falso)
    pygame.draw.rect(schermo, NERO, bottone_falso, 2)
    schermo.blit(font.render("FALSO", True, NERO), (bottone_falso.x + 28, bottone_falso.y + 12))


    # --------------------------------------------------------
    # 7. MESSAGGIO FINALE / FEEDBACK
    # --------------------------------------------------------

    parole = messaggio.split()
    riga = ""
    x_testo = pannello_x + 40
    y_messaggio = 570
    larghezza_massima = 280

    for parola in parole:
        prova = riga + parola + " "
        immagine_testo = font.render(prova, True, NERO)

        if immagine_testo.get_width() > larghezza_massima:
            schermo.blit(font.render(riga, True, NERO), (x_testo, y_messaggio))
            y_messaggio += 26
            riga = parola + " "
        else:
            riga = prova

    if riga != "":
        schermo.blit(font.render(riga, True, NERO), (x_testo, y_messaggio))


    # --------------------------------------------------------
    # 8. AGGIORNAMENTO DELLA FINESTRA
    # --------------------------------------------------------

    pygame.display.flip()
    orologio.tick(30)
