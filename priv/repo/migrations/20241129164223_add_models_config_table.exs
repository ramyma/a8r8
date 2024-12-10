defmodule ExSd.Repo.Migrations.AddModelsConfigTable do
  use Ecto.Migration

  def up do
    create table("models_config", primary_key: false) do
      add :name, :string, primary_key: true, null: false
      add :backend, :string, primary_key: true, null: false
      add :config, :map

      timestamps()
    end
  end

  def down do
    drop table("models_config")
  end
end
