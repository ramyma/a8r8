import useData, { FetchPolicy } from "./useData";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useEmbeddings = ({ fetchPolicy }: Props = {}) => {
  const { fetchData, data: embeddings } = useData<string[]>({
    name: "embeddings",
    fetchPolicy,
  });

  return { embeddings, fetchData };
};

export default useEmbeddings;
