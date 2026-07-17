"use client"

interface IgAccount {
    igAccountId: string
    username: string
    name: string
    profilePicture: string
    pageName: string
}

export function AccountSelector({
    accounts,
    onSelect,
}: {
    accounts: IgAccount[]
    onSelect: (id: string) => void
}) {
    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <h2 className="font-serif-display text-3xl text-white text-center mb-2">
                    Escolha a conta
                </h2>
                <p className="text-neutral-500 text-sm text-center mb-8">
                    Selecione qual Instagram deseja conectar
                </p>
                <div className="space-y-3">
                    {accounts.map((account) => (
                        <button
                            key={account.igAccountId}
                            onClick={() => onSelect(account.igAccountId)}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-[#111114] hover:border-[#3b82f6]/50 hover:bg-white/5 transition-all group"
                        >
                            {account.profilePicture ? (
                                <img
                                    src={account.profilePicture}
                                    alt={account.username}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] text-lg font-bold">
                                    {account.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="text-left">
                                <p className="text-white font-medium text-sm">
                                    @{account.username}
                                </p>
                                <p className="text-neutral-500 text-xs">
                                    {account.pageName}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
