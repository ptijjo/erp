import NavHeader from "./NavHeader";

type HeaderProps = {
  nom: string;
  imageUrl: string;
  organization: string;
};

const Header = ({ nom, imageUrl, organization }: HeaderProps) => {
  return (
    <header className="w-full flex items-center justify-between p-4 bg-gray-500 h-16 shrink-0">
      <h1 className="font-extrabold text-orange-500 text-4xl">VIFAA</h1>
      <NavHeader imageUrl={imageUrl} organization={organization} />
    </header>
  );
};

export default Header;