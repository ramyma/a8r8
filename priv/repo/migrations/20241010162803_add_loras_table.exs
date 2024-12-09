defmodule ExSd.Repo.Migrations.AddLorasTable do
  use Ecto.Migration

  def up do
    create table("loras", primary_key: false) do
      add :path, :string, primary_key: true, null: false
      add :civit_id, :integer
      add :name, :string, null: false
      add :metadata, :map

      timestamps()
    end
  end

  def down do
    drop table("loras")
  end
end
