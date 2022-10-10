import { UseCase } from "../../CompositionRoot";
import { Theme } from "../entities/Theme";
import { UsersRepository } from "../repositories/UsersRepository";

export class GetFilteredThemesUseCase implements UseCase {
    constructor(private usersRepository: UsersRepository) {}

    public async execute(themes: Theme[]): Promise<Theme[]> {
        const currentUser = await this.usersRepository.getCurrentUser();
        const { userGroups } = currentUser;

        const filteredThemes = themes.filter(theme => {
            return (
                userGroups.map(uG => theme.sharing.userGroups.map(userGroup => userGroup.id === uG.id)) ||
                theme.sharing.users.map(user => user.id === currentUser.id) ||
                theme.sharing.public !== "--------" ||
                theme.sharing.external ||
                theme.sharing === undefined
            );
        });

        return filteredThemes;
    }
}
