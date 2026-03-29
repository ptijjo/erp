import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";



const NavHeader = ({ imageUrl, organization }: { imageUrl: string, organization: string }) => {


    return (
        <nav className="flex items-center gap-2">
            <div>
                <p>{organization}</p>
            </div>
            <Avatar>
                <AvatarImage src={imageUrl} />
                <AvatarFallback>{imageUrl.split("/").pop()?.split(".")[0]}</AvatarFallback>
            </Avatar>
        </nav>
    );
};

export default NavHeader;