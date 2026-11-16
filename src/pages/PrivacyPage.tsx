import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HEALTH_CONSENT_TEXT } from "@/lib/healthConsent";

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold mt-6">{children}</h2>
);

/** Prestataires qui reçoivent des données, tels qu'ils sont réellement appelés par l'application. */
const PROCESSORS = [
  {
    name: "Lovable (Lovable Cloud, basé sur Supabase)",
    role: "Hébergement de la base de données, authentification et fonctions serveur",
    data: "Toutes les données de ton compte",
  },
  {
    name: "OpenAI (États-Unis)",
    role: "Analyse des photos, compréhension de la dictée, réponses de Sophie, récap du jour, défi, rapports, voix de Sophie",
    data: "Photos, repas, prénom, profil, symptômes, messages envoyés à Sophie",
  },
  {
    name: "Google (modèle Gemini, via Lovable)",
    role: "Recettes de l'onglet Idées",
    data: "Nutriments à compléter et restrictions alimentaires",
  },
  {
    name: "Resend (États-Unis)",
    role: "Envoi de l'e-mail quand tu utilises le bouton Feedback",
    data: "Ton message et ton adresse e-mail",
  },
  {
    name: "Netlify (États-Unis)",
    role: "Hébergement du site",
    data: "Adresse IP, journaux techniques",
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-4">Politique de confidentialité</h1>
        <div className="space-y-4 text-sm text-foreground leading-relaxed">
          <p>
            Cette page explique quelles données NutriMéno collecte, pourquoi, qui les reçoit et quels sont tes droits,
            conformément au <strong>Règlement général sur la protection des données (RGPD)</strong>.
          </p>

          <H2>1. Qui est responsable de tes données</H2>
          <p>
            Le responsable du traitement est l'éditrice de l'application NutriMéno (nutrimeno.com). Pour toute question
            sur tes données ou pour exercer tes droits, écris-nous avec le bouton « Feedback » de l'application. Nous
            répondons dans un délai d'un mois.
          </p>

          <H2>2. Les données que nous collectons</H2>
          <p>Nous collectons uniquement ce que tu saisis dans l'application, plus quelques données techniques :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Compte</strong> : adresse e-mail, mot de passe (chiffré), prénom.</li>
            <li><strong>Profil</strong> : âge, taille, poids et pesées, niveau d'activité, objectif, régime et restrictions alimentaires.</li>
            <li><strong>Données de santé</strong> : symptômes de la ménopause et leur intensité, sommeil, allergies et intolérances, conditions de santé déclarées, compléments alimentaires pris.</li>
            <li><strong>Alimentation</strong> : journal des repas, favoris, menus enregistrés, produits scannés.</li>
            <li><strong>Photos</strong> : photos d'assiette, de frigo, de fiche recette, d'étiquette et de complément, le temps de leur analyse.</li>
            <li><strong>Voix</strong> : le texte de ce que tu dictes. L'enregistrement sonore n'est pas conservé par NutriMéno.</li>
            <li><strong>Échanges avec Sophie</strong> : tes messages, les réponses, et les préférences qu'elle retient (aliments aimés ou évités, plats déjà proposés).</li>
            <li><strong>Suivi</strong> : sport, habitudes, notes personnelles, rappels.</li>
            <li><strong>Technique</strong> : date de création du compte, nombre de messages envoyés par jour, journaux techniques des serveurs.</li>
          </ul>
          <p>
            Les symptômes, le poids, les conditions de santé et les compléments sont des données de santé, protégées de
            façon renforcée par le RGPD.
          </p>

          <H2>3. Pourquoi nous utilisons tes données</H2>
          <p>
            Tes données servent uniquement à faire fonctionner l'application pour toi. Elles ne sont <strong>ni vendues,
            ni utilisées pour de la publicité</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Créer et gérer ton compte, calculer tes besoins et suivre ton alimentation : exécution du contrat (conditions d'utilisation).</li>
            <li>Suivre tes symptômes, ton poids et tes compléments, analyser tes photos et te répondre par l'assistante Sophie en en tenant compte : ton consentement explicite aux données de santé.</li>
            <li>T'envoyer les rappels que tu as activés : ton consentement (notifications du navigateur).</li>
            <li>Traiter tes retours, sécuriser le service et corriger les erreurs : intérêt légitime.</li>
          </ul>
          <p>Le consentement demandé à l'inscription est le suivant :</p>
          <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">{HEALTH_CONSENT_TEXT}</blockquote>
          <p>
            Tu peux le retirer à tout moment en supprimant ton compte. Le suivi des symptômes et les conseils
            personnalisés ne peuvent pas fonctionner sans lui.
          </p>
          <p>
            NutriMéno ne prend aucune décision automatique ayant un effet juridique sur toi. Les conseils de Sophie sont
            produits par une intelligence artificielle, peuvent contenir des erreurs et ne remplacent pas un avis médical.
          </p>

          <H2>4. Qui reçoit tes données</H2>
          <p>Tes données sont traitées par nous et par les prestataires techniques suivants, uniquement pour faire fonctionner l'application :</p>
          <ul className="space-y-2">
            {PROCESSORS.map((p) => (
              <li key={p.name} className="rounded-lg border border-border p-3">
                <strong>{p.name}</strong>
                <br />
                {p.role}.
                <br />
                <span className="text-muted-foreground">Données transmises : {p.data}.</span>
              </li>
            ))}
          </ul>
          <p>Certaines fonctions appellent directement un service depuis ton appareil :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Open Food Facts</strong> : le code-barres scanné ou le mot recherché, avec ton adresse IP. Aucun compte n'y est associé.</li>
            <li><strong>Dictée vocale</strong> : elle utilise la reconnaissance vocale de ton navigateur. Le son est traité par l'éditeur du navigateur (Google pour Chrome, Apple pour Safari), pas par NutriMéno.</li>
            <li><strong>Google Fonts</strong> : le chargement des polices transmet ton adresse IP à Google.</li>
          </ul>

          <H2>5. Transferts hors de l'Union européenne</H2>
          <p>
            Une partie de tes données, y compris des données de santé, est traitée aux États-Unis par OpenAI, Resend et
            Netlify. Ces transferts sont encadrés par les garanties prévues par le RGPD (cadre de protection des données
            UE–États-Unis ou clauses contractuelles types de la Commission européenne, selon le prestataire). Tu peux
            nous en demander le détail.
          </p>

          <H2>6. Combien de temps nous gardons tes données</H2>
          <p>
            Tes données sont conservées tant que ton compte existe, pour que ton historique reste disponible. Quand tu
            supprimes ton compte, ton profil et toutes tes données sont supprimés de la base ; des copies de sauvegarde
            techniques peuvent subsister quelque temps chez l'hébergeur. Les photos sont envoyées pour analyse et ne sont
            pas conservées par NutriMéno.
          </p>

          <H2>7. Tes droits</H2>
          <p>
            Tu peux accéder à tes données, les corriger, les supprimer, en limiter l'usage, t'y opposer, les récupérer
            dans un format réutilisable et retirer ton consentement.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Corriger</strong> : la plupart de tes données se modifient directement dans l'application (profil, journal, symptômes).</li>
            <li><strong>Supprimer</strong> : page Profil, bouton « Supprimer mon compte ». La suppression est définitive.</li>
            <li><strong>Obtenir une copie ou exercer un autre droit</strong> : écris-nous avec le bouton « Feedback ». Nous répondons sous un mois.</li>
          </ul>
          <p>
            Si tu estimes que tes droits ne sont pas respectés, tu peux déposer une réclamation auprès de la CNIL
            (cnil.fr).
          </p>

          <H2>8. Sécurité et stockage sur ton appareil</H2>
          <p>
            Les échanges avec l'application sont chiffrés (HTTPS). L'accès à ton compte est protégé par mot de passe, et
            chaque utilisatrice n'accède qu'à ses propres données dans la base.
          </p>
          <p>
            NutriMéno n'utilise aucun cookie publicitaire ni outil de mesure d'audience. L'application enregistre sur ton
            appareil ta session de connexion et quelques réglages (rappels, affichage), nécessaires à son fonctionnement.
          </p>

          <H2>9. Mineures et modifications</H2>
          <p>
            NutriMéno s'adresse à des femmes adultes et n'est pas destinée aux personnes de moins de 18 ans. Si cette
            politique change de façon importante, nous te prévenons dans l'application avant l'entrée en vigueur.
          </p>
          <p className="text-muted-foreground">Dernière mise à jour : 16 novembre 2026.</p>
        </div>
      </div>
    </div>
  );
}
