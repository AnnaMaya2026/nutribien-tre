import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-4">Politique de confidentialité</h1>
        <div className="space-y-4 text-sm text-foreground leading-relaxed">
          <p>
            NutriMéno respecte votre vie privée et s'engage à protéger vos données
            personnelles conformément au <strong>Règlement Général sur la Protection des
            Données (RGPD)</strong>.
          </p>
          <h2 className="text-lg font-semibold mt-6">1. Données collectées</h2>
          <p>
            Nous collectons uniquement les données nécessaires au fonctionnement de
            l'application : adresse email, informations de profil (âge, poids, taille,
            symptômes), journal alimentaire, routines et notes personnelles.
          </p>
          <h2 className="text-lg font-semibold mt-6">2. Utilisation des données</h2>
          <p>
            Vos données servent exclusivement à personnaliser votre expérience dans
            l'application : calcul de vos besoins nutritionnels, suivi de vos symptômes
            et conseils adaptés. Elles ne sont <strong>jamais revendues</strong> à des
            tiers.
          </p>
          <h2 className="text-lg font-semibold mt-6">3. Stockage et sécurité</h2>
          <p>
            Vos données sont stockées de manière sécurisée sur des serveurs européens
            via notre infrastructure cloud. L'accès est protégé par authentification
            et chiffrement.
          </p>
          <h2 className="text-lg font-semibold mt-6">4. Vos droits</h2>
          <p>
            Vous disposez d'un droit d'accès, de rectification, d'opposition et de
            suppression de vos données. Vous pouvez supprimer votre compte et toutes
            vos données à tout moment depuis la page Profil → « Supprimer mon compte ».
          </p>
          <h2 className="text-lg font-semibold mt-6">5. Cookies</h2>
          <p>
            NutriMéno utilise uniquement des cookies techniques nécessaires à
            l'authentification et au fonctionnement de l'application. Aucun cookie
            publicitaire ou de tracking tiers n'est utilisé.
          </p>
          <h2 className="text-lg font-semibold mt-6">6. Contact</h2>
          <p>
            Pour toute question relative à vos données personnelles, contactez-nous via
            le bouton « Feedback » de l'application.
          </p>
        </div>
      </div>
    </div>
  );
}
