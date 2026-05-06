import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-foreground mb-4">Conditions d'utilisation</h1>
        <div className="space-y-4 text-sm text-foreground leading-relaxed">
          <p>
            <strong>NutriMéno</strong> est une application destinée à fournir des informations
            nutritionnelles et un accompagnement personnalisé pour les femmes en période de
            péri-ménopause, ménopause et post-ménopause.
          </p>
          <h2 className="text-lg font-semibold mt-6">1. Objet de l'application</h2>
          <p>
            NutriMéno est un outil d'aide nutritionnelle à but informatif uniquement.
            Les conseils, suivis et recommandations proposés ne remplacent en aucun cas
            l'avis d'un professionnel de santé qualifié (médecin, gynécologue, diététicien,
            nutritionniste).
          </p>
          <h2 className="text-lg font-semibold mt-6">2. Absence d'avis médical</h2>
          <p>
            Les contenus présentés (suggestions de menus, analyses de symptômes, conseils
            de Sophie l'IA) sont génériques et ne tiennent pas compte de votre dossier
            médical. En cas de doute, de symptôme persistant ou de pathologie connue,
            consultez impérativement votre médecin.
          </p>
          <h2 className="text-lg font-semibold mt-6">3. Données utilisateur</h2>
          <p>
            Vos données personnelles et de santé sont stockées de manière sécurisée et
            ne sont jamais revendues à des tiers. Vous pouvez à tout moment supprimer
            votre compte et l'ensemble de vos données depuis la page Profil.
          </p>
          <h2 className="text-lg font-semibold mt-6">4. Responsabilité</h2>
          <p>
            L'utilisation de l'application se fait sous votre seule responsabilité.
            NutriMéno ne saurait être tenu responsable d'un usage inadapté des
            informations fournies.
          </p>
          <h2 className="text-lg font-semibold mt-6">5. Modification des CGU</h2>
          <p>
            Ces conditions peuvent être mises à jour. Les utilisateurs seront informés
            via l'application en cas de modification importante.
          </p>
        </div>
      </div>
    </div>
  );
}
