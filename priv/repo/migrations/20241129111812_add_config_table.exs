defmodule ExSd.Repo.Migrations.AddConfigTable do
  use Ecto.Migration

  def up do
    create table("config", primary_key: false) do
      add :name, :string, primary_key: true, null: false
      add :config, :map

      timestamps()
    end
  end

  def down do
    drop table("config")
  end
end
