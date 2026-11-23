# Urlaubsplaner 2027–2028

Mobile Urlaubskalender-Web-App für 2027 und 2028 mit österreichischen Feiertagen, Urlaubssaldo, Druckansicht, Import und Export.

## Stand

Die Anwendung kann derzeit **lokal** verwendet werden. In diesem Modus liegen Urlaubsdaten im Browser und können beim Löschen der Browserdaten verloren gehen. **Dauerhafte, geräteübergreifende Speicherung erfordert die Aktivierung der Supabase-Cloud.** Der Quellcode für E-Mail-Anmeldung und personenbezogen geschützte Speicherung ist vorbereitet. Ohne eine Supabase-Konfiguration ist das noch nicht aktiv.

## Sichere Online-Anmeldung aktivieren

1. Ein Supabase-Projekt unter https://supabase.com erstellen.
2. Den Inhalt von `supabase-setup.sql` im Supabase SQL Editor ausführen. Die Row Level Security Policies sichern jeden Datensatz anhand der angemeldeten Benutzer-ID ab.
3. Unter Supabase > Authentication > URL Configuration die offizielle HTTPS-Adresse deiner GitHub-Pages-Web-App als **Site URL** und unter **Redirect URLs** hinzufügen.
4. Unter Authentication > Providers > Email die E-Mail-OTP/Magic-Link-Anmeldung aktivieren und E-Mail-Versand konfigurieren.
5. In `auth-config.js` die **Project URL** und den **publishable/anon key** eintragen (niemals den service_role/secret key).
6. GitHub Pages für den Branch `main` und Root `/` aktivieren.

Nach diesen Schritten meldet sich jede Person mit ihrer eigenen E-Mail-Adresse an. Einträge liegen getrennt und online in Supabase. Beim Löschen der Browserdaten wird lediglich die lokale Anmeldung entfernt. Die Person kann sich erneut per E-Mail-Link anmelden und ihre Serverdaten wieder laden.

**Wichtig:** Vor Aktivierung der Cloud bestehende lokale Daten über `Daten als JSON sichern` exportieren. Nach erfolgreicher Anmeldung können sie importiert und dann im eigenen Benutzerkonto gespeichert werden. Nutzer sollten außerdem regelmäßig JSON-Backups erstellen.

### Tests nach Einrichtung

- Konto A anmelden, Urlaub eintragen, Seite neu laden: Eintrag bleibt bestehen.
- Konto A abmelden und Konto B anmelden: Eintrag von A ist nicht sichtbar.
- Konto B abmelden, Konto A anmelden: Eigener Eintrag ist wieder sichtbar.
- Browser-Website-Daten löschen, Konto A per E-Mail-Link wieder anmelden: Serverdaten sind unverändert vorhanden.
- Auf Android/Samsung und Desktop Darstellung und Bedienung prüfen.

## Datenschutz

Die GitHub-Repository-Dateien enthalten keine Benutzer-Urlaubspläne. Das Repository ist öffentlich und darf deshalb keine privaten Zugangsdaten oder Secret Keys enthalten. Kontodaten werden über Supabase Auth verwaltet und Kalenderdaten über Row Level Security pro Nutzer geschützt.

Privates, unabhängiges Projekt; keine offizielle BBRZ-Anwendung.
