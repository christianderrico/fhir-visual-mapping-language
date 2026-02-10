import { useState } from "react";
import {
  Button,
  Checkbox,
  Container,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { upperFirst, useToggle } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";

export function LoginPage(props: any) {
  const [type] = useToggle(["login", "register"]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(true);
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(email === "DeepAlma" && password === "SuperPoppata")
        navigate("/definition")
  };

  return (
    <Container size={840}>
      <Paper radius="md" p="lg" withBorder {...props}>
        <Text size="lg" fw={500}>
          {upperFirst(type)}
        </Text>

        <Divider label="Continue with credentials" labelPosition="center" my="lg" />

        <form onSubmit={handleSubmit}>
          <Stack>
            {type === "register" && (
              <TextInput
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                radius="md"
              />
            )}

            <TextInput
              required
              label="Username"
              placeholder="admin"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              radius="md"
            />

            <PasswordInput
              required
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              radius="md"
            />

            {type === "register" && (
              <Checkbox
                label="I accept terms and conditions"
                checked={terms}
                onChange={(e) => setTerms(e.currentTarget.checked)}
              />
            )}
          </Stack>

          <Group justify="space-between" mt="xl">
            <Button type="submit" radius="xl">
              {upperFirst(type)}
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
}
