/// <reference path="../pb_data/types.d.ts" />
// Pastikan semua user yang login (warga biasa maupun pengurus) bisa list & view
// wallets — khususnya untuk melihat saldo KAS di dashboard. Sebelumnya rule
// sempat berubah di production sehingga warga biasa dapat list kosong.
//
// Create & update tetap dibatasi superuser (aman dari edit tak sah).

migrate(
	(app) => {
		const collection = app.findCollectionByNameOrId('pbc_120182150')

		unmarshal(
			{
				listRule: "@request.auth.id != ''",
				viewRule: "@request.auth.id != ''"
			},
			collection
		)

		return app.save(collection)
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('pbc_120182150')

		unmarshal(
			{
				listRule: "@request.auth.collectionName = '_superusers'",
				viewRule: "@request.auth.collectionName = '_superusers'"
			},
			collection
		)

		return app.save(collection)
	}
)
