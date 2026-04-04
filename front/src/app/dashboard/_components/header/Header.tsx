import NavHeader from "./NavHeader";

type HeaderProps = {
  nom: string;
  imageUrl: string;
  organization: string;
  displayName?: string;
};

const Header = ({ nom, imageUrl, organization, displayName }: HeaderProps) => {
  return (
    <header className="flex h-16 w-full shrink-0 items-center justify-between bg-gray-500 p-4">
      <h1 className="text-4xl font-extrabold text-orange-500">VIFAA</h1>
      <NavHeader
        imageUrl={imageUrl}
        organization={organization}
        displayName={displayName ?? nom}
      />
    </header>
  );
};

export default Header;